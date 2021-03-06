
(function (exports) {

	(function () {
		$('.dropdown-menu .logout').click(function (e) {
			e.preventDefault();
			$.ajax({
				type: 'POST',
				url: '/logout',
				cache: false,
				xhrFields: {
					withCredentials: true
				},
				success: function (rsp) {
					if (rsp.code === "ok" || rsp.code === "InvalidSession") {
						var href = window.location.href;
						if (href !== '/login') {
							href = '/login?to=' + encodeURIComponent(href);
						}
						window.location.href = href;
					} else {
						alert("logout failed," + rsp.code);
					}
				}
			});
		});
	})();

	function getTableHeight() {
		return $(window).height() - $('h1').outerHeight(true);
	}

	function rowStyle(row, index) {
		if (row.id === '') {
			return { classes: 'new-row' };
		}
		return '';
	}

	function on_init_recode_lists(did) {
		var $table = $('#tb_recodes'),
			$remove = $('#remove'),
			$add = $('#add'),
			selections = [],
			operateEvents = {
				'click .save': function (e, value, row, idx) {
					if (row.id && row.id > 0) {
						ddns_update_recode(row.id, { host: row.host, type: row.type, value: row.value, ttl: row.ttl },
							function (rspData) {
								if (rspData.code === "ok") {
									alert("ok");
								} else {
									var msg = rspData.code;
									if (rspData.msg && rspData.msg.length)
										msg += ("   " + rspData.msg);
									alert(msg);
								}
							});
					} else {
						ddns_new_recode(
							did,
							{ host: row.host, type: row.type, value: row.value, ttl: row.ttl },
							function (rspData) {
								if (rspData.code == "ok") {
									$table.bootstrapTable('updateRow', { index: idx, row: { id: rspData.id, key: rspData.key, dynamic: rspData.dynamic } });
								} else {
									var msg = rspData.code;
									if (rspData.msg && rspData.msg.length)
										msg += ("   " + rspData.msg);
									alert(msg);
								}
							}
						);
					}
				},
				'click .remove': function (e, value, row, index) {
					if (row.id === undefined || row.id === '') {
						if (row.randomId) {
							$table.bootstrapTable('remove', {
								field: 'randomId',
								values: [row.randomId]
							});
						}
					} else {
						ddns_delete_recode(row.id,
							function (data) {
								if (data.code === "ok") {
									$table.bootstrapTable('remove', {
										field: 'id',
										values: [row.id]
									});
								} else {
									var msg = data.code;
									if (data.msg && data.msg.length)
										msg += ("   " + data.msg);
									alert(msg);
								}
							}
						);
					}
				}
			};

		function formatDynamic(value, row, index) {
			return '<input class="dynamic" type="checkbox"' + (value === true ? 'checked="checked"' : '') + '"/>';
		}

		function initTable() {
			$table.bootstrapTable({
				height: getTableHeight(),
				columns: [
					[
						{
							title: 'ID',
							field: 'id',
							align: 'center',
							valign: 'middle',
							visible: false,
							//sortable: true,
						}, {
							field: 'host',
							title: 'Host Recode',
							//sortable: true,
							editable: true,
							align: 'center'
						}, {
							field: 'value',
							title: 'Recode Value',
							editable: true,
							align: 'center'
						}, {
							field: 'type',
							title: 'Recode Type',
							align: 'center',
							editable: {
								type: 'select',
								value: 1,
								source: [
									{ value: 1, text: 'A' },
									{ value: 2, text: 'AAAA' },
									{ value: 3, text: 'CNAME' }
								]
							},
						}, {
							field: 'ttl',
							title: 'TTL',
							//sortable: true,
							editable: true,
							align: 'center'
						}, {
							field: 'dynamic',
							title: 'Dynamic',
							//sortable: true,
							//editable: true,
							align: 'center',
							formatter: formatDynamic,
							events: {
								'click .dynamic': function (e, value, row, index) {
									row.dynamic = !value;
								}
							}
						}, {
							field: 'key',
							title: 'Update Key',
							align: 'center',
							visible: false,
						}, {
							field: 'operate',
							title: 'Operate',
							align: 'center',
							events: operateEvents,
							formatter: operateFormatter
						}
					]
				],
				responseHandler: responseHandler,
				url: "/domain/" + did + "/recodes",
				rowStyle: rowStyle
			});

			$remove.click(function () {
				var ids = getIdSelections();
				$table.bootstrapTable('remove', {
					field: 'id',
					values: ids
				});
				$remove.prop('disabled', true);
			});
			$add.click(function () {
				var randomId = Number(new Date());
				$table.bootstrapTable('insertRow', {
					index: 0,
					row: {
						id: '',
						host: '@',
						key: '',
						value: '',
						type: 1,
						ttl: 600,
						dynamic: true,
						randomId: randomId
					}
				});
			});
			$(window).resize(function () {
				$table.bootstrapTable('resetView', {
					height: getTableHeight()
				});
			});
		}
		function getIdSelections() {
			return $.map($table.bootstrapTable('getSelections'), function (row) {
				return row.id;
			});
		}
		function responseHandler(res) {
			if (res) {
				if (res.code == "ok") {
					return {
						"total": res.recodes.length,
						"rows": res.recodes
					};
				} else {
					var msg = res.code;
					if (res.msg && res.code.length)
						msg += ("   " + res.msg);
					alert(msg);
				}
			}
			return {
				"total": 0,
				"rows": []
			};
		}
		function operateFormatter(value, row, index) {
			return [
				'<a class="save" href="javascript:void(0)" title="Save">',
				'<i class="	glyphicon glyphicon-saved"></i>',
				'</a>',
				'<a class="remove" href="javascript:void(0)" title="Remove">',
				'<i class="glyphicon glyphicon-remove"></i>',
				'</a>'
			].join('');
		}
		initTable();
	}

	function on_init_domians_view() {
		var $table = $('#tb_domains'),
			$remove = $('#remove'),
			$add = $('#add'),
			selections = [],
			operateEvents = {
				'click .save': function (e, value, row, idx) {
					if (row.id && row.id > 0) {
						ddns_update_domain(row.id, row.domain,
							function (rspData) {
								if (rspData.code == "ok") {
									$table.bootstrapTable('updateRow', { index: idx, row: { id: rspData.id } });
								} else {
									var msg = rspData.code;
									if (rspData.msg && rspData.msg.length)
										msg += ("   " + rspData.msg);
									alert(msg);
								}
							});
					} else {
						ddns_new_domain(row.domain,
							function (rspData) {
								if (rspData.code == "ok") {
									$table.bootstrapTable('updateRow', { index: idx, row: { id: rspData.id } });
								} else {
									var msg = rspData.code;
									if (rspData.msg && rspData.msg.length)
										msg += ("   " + rspData.msg);
									alert(msg);
								}
							},
							function (a, b, c) { }
						);
					}
				},
				'click .remove': function (e, value, row, index) {
					if (row.id === undefined || row.id === '') {
						if (row.randomId) {
							$table.bootstrapTable('remove', {
								field: 'randomId',
								values: [row.randomId]
							});
						}
					} else {
						ddns_delete_domain(row.id,
							function (data) {
								if (data.code === "ok") {
									$table.bootstrapTable('remove', {
										field: 'id',
										values: [row.id]
									});
								} else {
									var msg = data.code;
									if (data.msg && data.msg.length)
										msg += ("   " + data.msg);
									alert(msg);
								}
							}
						);
					}
				}
			};

		function operateFormatter() {
			return [
				'<a class="save" href="javascript:void(0)" title="Like">',
				'<i class="	glyphicon glyphicon-saved"></i>',
				'</a>',
				'<a class="remove" href="javascript:void(0)" title="Remove">',
				'<i class="glyphicon glyphicon-remove"></i>',
				'</a>'
			].join('');
		}
		function responseHandler(res) {
			if (res) {
				if (res.code == "ok") {
					return {
						"total": res.domains.length,
						"rows": res.domains
					};
				} else {
					var msg = res.code;
					if (res.msg && res.code.length)
						msg += ("   " + res.msg);
					alert(msg);
				}
			}
			return {
				"total": 0,
				"rows": []
			};
		}
		function formatId(value, row, index) {
			return '<a href="/domain/' + value + '/recodes">' + value + '</a>';
		}

		(function () {
			$table.bootstrapTable({
				height: getTableHeight(),
				columns: [
					[
						{
							title: 'ID',
							field: 'id',
							align: 'center',
							valign: 'middle',
							formatter: formatId,
							//visible: false,
						}, {
							field: 'domain',
							title: 'Domain',
							editable: true,
							align: 'center'
						}, {
							field: 'operate',
							title: 'Operate',
							align: 'center',
							events: operateEvents,
							formatter: operateFormatter
						}
					]
				],
				responseHandler: responseHandler,
				rowStyle: rowStyle
			});

			$remove.click(function () {
				var ids = getIdSelections();
				$table.bootstrapTable('remove', {
					field: 'id',
					values: ids
				});
				$remove.prop('disabled', true);
			});
			$add.click(function () {
				var randomId = Number(new Date());
				$table.bootstrapTable('insertRow', {
					index: 0,
					row: {
						id: '',
						name: 'test.site',
						key: '',
						value: '',
						ttl: 600,
						dynamic: true,
						randomId: randomId
					}
				});
			});
			$(window).resize(function () {
				$table.bootstrapTable('resetView', {
					height: getTableHeight()
				});
			});
		})();
	}

	function on_init_downloads_view() {
		var $table = $('#dtable'),
			$dbtn = $('#dbtn'),
			$DInput = $("#d-input"),
			operateEvents = {
				'click .remove': function (e, value, row, idx) {
					d_delete_download({ id: row.id, dest: row.dest },
						function (rspData) {
							if (rspData.code === "ok") {
								$table.bootstrapTable('refresh');
							} else {
								var msg = rspData.code;
								if (rspData.msg && rspData.msg.length)
									msg += ("   " + rspData.msg);
								alert(msg);
							}
					});
				}
			};
			
		(function () {
			$table.bootstrapTable({
				height: getTableHeight(),
				columns: [
					[
						{
							title: 'ID',
							field: 'id',
							align: 'center',
							valign: 'middle',
							visible: false,
						}, {
							field: 'name',
							title: 'Name',
							align: 'left',
							formatter: nameFormatter
						}, {
							field: 'size',
							title: 'Size',
							align: 'right',
							formatter: sizeFormatter,
						}, {
							field: 'progress',
							title: 'Progress',
							formatter: progressFormatter,
							align: 'center'
						}, {
							field: 'bytesPerSecond',
							title: 'Speed',
							formatter: speedFormatter,
							align: 'center'
						}, {
							field: 'operate',
							title: 'Operate',
							align: 'center',
							events: operateEvents,
							formatter: operateFormatter
						}
					]
				],
				responseHandler: responseHandler,
				rowStyle: rowStyle
			});
			$dbtn.click(function () {
				if ($DInput.val().length === 0) {
					alert("please enter url...");
					return;
				}

				var url = $DInput.val();
				d_download_url(url, function (data) {
					if (data.code === "ok") {
						$table.bootstrapTable('refresh');
						$DInput.val("");
					} else {
						var msg = data.code;
						if (data.msg && data.msg.length)
							msg += ("   " + data.msg);
						alert(msg);
					}
				});
			});
			$(window).resize(function () {
				$table.bootstrapTable('resetView', {
					height: getTableHeight()
				});
			});
			function responseHandler(res) {
				if (res) {
					if (res.code == "ok") {
						return {
							"total": res.tasks.length,
							"rows": res.tasks
						};
					} else {
						var msg = res.code;
						if (res.msg && res.code.length)
							msg += ("   " + res.msg);
						alert(msg);
					}
				}
				return {
					"total": 0,
					"rows": []
				};
			}
			function operateFormatter(value, row, index) {
				return [
					'<a class="download" href="' + row.dest + '" target=_blank title="Download">',
					'<i class="glyphicon glyphicon-download-alt"></i>',
					'</a>',
					'<a class="remove" href="javascript:void(0)" title="Remove">',
					'<i class="glyphicon glyphicon-remove"></i>',
					'</a>'
				].join('');
			}
			function nameFormatter(value, row, index) {
				if (row.src && row.src.length)
					return '<span title="' + row.src + '">' + value + '</span>';
				return value;
			}
			function progressFormatter(value, row, index) {
				if (row.size && row.size > 0) {
					if (row.transferred !== undefined) {
						return precision(row.transferred / (row.size * 1.0) * 100) + "%";
					} else {
						return "0%";
					}
				}
			}
			function speedFormatter(value, row, index) {
				if (value < 1024) {
					return precision(value) + "Byte/s";
				} else if (value < 1024 * 1024) {
					return precision(value / 1024.0) + "Kb/s";
				} else if (value < 1024 * 1024 * 1024) {
					return precision(value / (1024.0 * 1024)) + "Mb/s";
				} else {
					return precision(value / (1024.0 * 1024 * 1024)) + "Gb/s";
				}
			}
			function sizeFormatter(value, row, index) {
				if (value < 1024) {
					return precision(value) + "Byte";
				} else if (value < 1024 * 1024) {
					return precision(value / 1024.0) + "K";
				} else if (value < 1024 * 1024 * 1024) {
					return precision(value / (1024.0 * 1024)) + "M";
				} else {
					return precision(value / (1024.0 * 1024 * 1024)) + "G";
				}
			}
		})();

		var refreshTable = function () {
			if (!document.getElementById('dtable')) return;
			d_get_downloads(function (data) {
				var tableData = $table.bootstrapTable('getData');
				var updateTable = function (task) {
					var i = 0;
					for (; i < tableData.length; ++i) {
						if (tableData[i].dest === task.dest) {
							if (tableData[i].transferred !== task.transferred || tableData[i].bytesPerSecond !== task.bytesPerSecond) {
								tableData[i].transferred = task.transferred;
								tableData[i].bytesPerSecond = task.bytesPerSecond;
								$table.bootstrapTable('updateRow', i, tableData[i]);
							}
							break;
						}
					}
					if (i === tableData.length) {
						$table.bootstrapTable('refresh');
						return false;
					}
				};
				if (data.code === "ok" && data.tasks && data.tasks.length) {
					$.each(data.tasks, function (index, task, array) {
						if (updateTable(task) === false) {
							return false;
						}
					});
				}
			});
			setTimeout(refreshTable, 500);
		};
		refreshTable();
	}

	exports.on_init_recode_lists = on_init_recode_lists;
	exports.on_init_domians_view = on_init_domians_view;
	exports.on_init_downloads_view = on_init_downloads_view;

})((typeof (exports) === "object" ? exports : window), jQuery);
