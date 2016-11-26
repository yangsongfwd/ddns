package ddns

import (
	"bufio"
	"net"
	"os"
	"regexp"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"

	"github.com/inimei/backup/log"
	"github.com/inimei/ddns/config"
)

type Hosts struct {
	fileHosts *FileHosts

	hostWatcher *fsnotify.Watcher
}

func NewHosts(hs config.HostsSettings) Hosts {
	fileHosts := &FileHosts{
		file:  hs.HostsFile,
		hosts: make(map[string]string),
	}

	hosts := Hosts{fileHosts, nil}
	hosts.refresh()
	return hosts
}

/*
Match local /etc/hosts file first, remote redis records second
*/
func (h *Hosts) Get(domain string, family int) ([]net.IP, bool) {

	var sips []string
	var ip net.IP
	var ips []net.IP

	sips, _ = h.fileHosts.Get(domain)

	if sips == nil {
		return nil, false
	}

	for _, sip := range sips {
		switch family {
		case _IP4Query:
			ip = net.ParseIP(sip).To4()
		case _IP6Query:
			ip = net.ParseIP(sip).To16()
		default:
			continue
		}
		if ip != nil {
			ips = append(ips, ip)
		}
	}

	return ips, (ips != nil)
}

/*
Update hosts records from /etc/hosts file and redis per minute
*/
func (h *Hosts) refresh() {
	if h.hostWatcher != nil {
		return
	}

	var err error
	h.hostWatcher, err = fsnotify.NewWatcher()
	if err != nil {
		log.Error(err.Error())
	}

	//done := make(chan bool)
	go func() {
		for {
			select {
			case event := <-h.hostWatcher.Events:
				log.Info("event: %v", event)
				if event.Op&fsnotify.Write == fsnotify.Write {
					log.Info("modified file: %v", event.Name)
					h.fileHosts.Refresh()
				}
			case err := <-h.hostWatcher.Errors:
				if err != nil {
					log.Info("error: %v", err)
				}
			}
		}
	}()

	err = h.hostWatcher.Add(h.fileHosts.file)
	if err != nil {
		log.Error(err.Error())
	}
}

type FileHosts struct {
	file  string
	hosts map[string]string
	mu    sync.RWMutex
}

func (f *FileHosts) Get(domain string) ([]string, bool) {
	domain = strings.ToLower(domain)
	f.mu.RLock()
	ip, ok := f.hosts[domain]
	f.mu.RUnlock()
	if !ok {
		return nil, false
	}
	return []string{ip}, true
}

func (f *FileHosts) Refresh() {
	buf, err := os.Open(f.file)
	if err != nil {
		log.Warn("Update hosts records from file failed %s", err)
		return
	}
	defer buf.Close()

	f.mu.Lock()
	defer f.mu.Unlock()

	f.clear()

	scanner := bufio.NewScanner(buf)
	for scanner.Scan() {

		line := scanner.Text()
		line = strings.TrimSpace(line)

		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}

		sli := strings.Split(line, " ")
		if len(sli) == 1 {
			sli = strings.Split(line, "\t")
		}

		if len(sli) < 2 {
			continue
		}

		domain := sli[len(sli)-1]
		ip := sli[0]
		if !f.isDomain(domain) || !f.isIP(ip) {
			continue
		}

		f.hosts[strings.ToLower(domain)] = ip
	}
	log.Debug("update hosts records from %s", f.file)
}

func (f *FileHosts) clear() {
	f.hosts = make(map[string]string)
}

func (f *FileHosts) isDomain(domain string) bool {
	if f.isIP(domain) {
		return false
	}
	match, _ := regexp.MatchString(`^([a-zA-Z0-9\*]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$`, domain)
	return match
}

func (f *FileHosts) isIP(ip string) bool {
	return (net.ParseIP(ip) != nil)
}
