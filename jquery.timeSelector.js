/**
 * jquery.timeSelect 
 * 时间选择插件
 * 
 * @autor abel
 * @createAt 2017/06/16
 *
 * @version 
 * 2.0.0
 *     
 * 1.2.0
 * 
 * 1.0.1 
 *     fix 
 * 1.0.0
 *     
 */
;(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        factory(root.jQuery);
    }
}(this, function($) {
    'use strict';

    var template = [
        '<div class="timeselector-box">',
        '<div class="timeselector-box-hd">',
        '<div class="timeselector-tips">支持shift选择和拖动选择</div>',
        '<div class="timeitem-example-wrap"><span class="timeitem-example is-active"></span>投放时间段 <span class="timeitem-example"></span>暂停时间段</div>',
        '</div>',
        '<div class="timeselector-box-bd">',
        '<table class="timeselector-table">',
        '<thead>',
        '<tr>',
        '<th rowspan="2" class="first-head">',
        '<div>时间</div>',
        '<span class="line"></span>',
        '<div>星期</div>',
        '</th>',
        '<th colspan="12">上午</th>',
        '<th colspan="12">下午</th>',
        '</tr>',
        '<tr>',
    ];
    for (var i = 0; i < 24; i++) {
        template.push('<th>' + i + '</th>')
    }
    Array.prototype.push.apply(template, [
        '</tr>',
        '</thead>',
        '<tbody></tbody>',
        '</table>',
        '<div class="select-mask"></div>',
        '</div>',
        '<div class="timeselector-box-ft">',
        '<div><button target="workday">工作日</button><button target="weekend">周末</button><button target="selectAll">全选</button><button target="reverse">反选</button><button target="clear">清空</button></div>',
        '<div><dl class="timeselector-select-result">',
        '<dt>已选择日期：</dt>',
        '<dd></dd>',
        '</dl></div>',
        '</div>',
        '</div>'
    ]);

    var weekMap = ['一', '二', '三', '四', '五', '六', '天'];

    function TimeSelector(el, options) {
        this.$container = $(el);
        this.options = options;
        this.init();
    }

    TimeSelector.version = "1.0.0";

    /**
     * 计算区间
     * @example
     *   [0,1,2,3]
     *   [
     *       [0,3]
     *   ]
     *   
     *   [0,1,2,3,5,6,7]
     *   [
     *       [0,3],
     *       [5,7]
     *   ]
     *   
     *   [0,2,3,5,6,7]
     *   [
     *       [0,0],
     *       [2,3],
     *       [5,7]
     *   ]
     * @param  {Array} array  区间组数
     * @return {Array[Array]}   返回分段的区间数组
     */
    TimeSelector.timeRange = function(array) {
        var result = []
        var i, length = array.length,
            currentAtt;
        // array.sort(function(a, b) {
        //     return a > b
        // });
        result.push([array[0], array[0]])
        currentAtt = result[result.length - 1];

        for (i = 1; i < length; i++) {
            if (currentAtt[1] + 1 == array[i]) {
                currentAtt[1] = array[i]
            } else {
                result.push([array[i], array[i]]);
                currentAtt = result[result.length - 1]
            }
        }
        return result;
    }

    /**
     * 拟人化
     * 将指定数据转化成指定话术
     *
     * 例如：
     *  {
     *      0:[1,2,3,4,5,6,7,..,24]
     *  }
     *
     * 星期天：全天
     *
     *  {
     *      0:[1,2,3,4,5,10,12,...,24]
     *  }
     *
     *  星期天：1点～5点 10点～24点
     * 
     * @param  {Object} data 
     * @return {String}      
     */
    TimeSelector.humanize = function(data) {
        var weekMap = ['天', '一', '二', '三', '四', '五', '六'];

        function voice(arr) {
            var i = 0,
                j = 0,
                length = arr.length,
                len,
                result = [];
            $.each(arr, function(_, item) {
                if (item[0] == item[1]) {
                    result.push(item[0] + ':00')
                } else {
                    result.push(item[0] + ':00' + '~' + arr[i][1] + ':00')
                }
            })
            return result;
        }

        var list = [];
        for (var k in data) {
            //console.log('星期' + weekMap[k]);
            list.push('星期' + weekMap[k] + '：' + voice(TimeSelector.timeRange(data[k])).join(','))
        }
        return list;
    }


    TimeSelector.prototype = {
        init: function() {
            var $template = $(template.join(''));
            var tr = '';
            var maxRow = 7,
                maxCol = 24;
            var i, j;
            for (i = 0; i < maxRow; i++) {
                tr += '<tr><td>星期' + weekMap[i] + '</td>';
                for (j = 0; j < maxCol; j++) {
                    tr += '<td class="time-item" data-time-row="' + i + '" data-time-col="' + j + '"></td>';
                }
                tr += '</tr>';
            }
            $template.find('tbody').html(tr);
            this.$container.append($template);
            this.$box = this.$container.find('.timeselector-table tbody');

            this.set(this.options.defaultData);

            if (this.options.editMode) {
                this.bind();
            }
        },
        change: function() {
            this.humanize();
        },
        bind: function() {
            var lastClickItem, //上次点击的
                isShift;

            var that = this;

            var isMousedown = false,
                lastMousedownItem,
                fisrtItemPos = {},
                lastItemPos = {},
                isMove = false;

            var colWidth = this.$box.find('.time-item')[0].offsetWidth,
                colHeight = this.$box.find('.time-item')[0].offsetHeight;
            this.$box
                .on('click', '.time-item', function() {
                    var $this = $(this);
                    $this.toggleClass('is-active');
                    //是否按下shift
                    if (isShift && lastClickItem) {
                        var lastRow = lastClickItem.attr('data-time-row'),
                            lastCol = parseInt(lastClickItem.attr('data-time-col'), 10),
                            row = $this.attr('data-time-row'),
                            col = parseInt($this.attr('data-time-col'), 10);
                        var selectData = that._selectRange(lastRow, lastCol + 1, row, col + 1);
                        that.set(selectData);
                        lastClickItem = null;
                    }
                    lastClickItem = $this;
                    isMousedown = false;
                    $('.select-mask').hide();
                    that.change();
                })
                .on('mousedown', '.time-item', function(e) {
                    var $target = $(e.target)
                    $('.select-mask').css($target.offset());
                    isMousedown = true;
                    lastMousedownItem = $(this);
                    fisrtItemPos.row = $target.attr('data-time-row');
                    fisrtItemPos.col = $target.attr('data-time-col');

                    fisrtItemPos.x = e.pageX;
                    fisrtItemPos.y = e.pageY;
                })
                .on('mousemove', '.time-item', function(e) {
                    if (isMousedown) {
                        if (Math.abs(fisrtItemPos.x - e.pageX) > colWidth ||
                            Math.abs(fisrtItemPos.y - e.pageY) > colHeight) {
                            isMove = true;
                            var $target = $(e.target);
                            // var col = $target.attr('data-time-col'),
                            //     row = $target.attr('data-time-row');
                            //移动记录最后一次坐标 以免移出无法计算文字
                            lastItemPos.row = $target.attr('data-time-row');
                            lastItemPos.col = $target.attr('data-time-col');
                            $('.select-mask')
                                .show()
                                .css({
                                    top: Math.min(fisrtItemPos.row, lastItemPos.row) * colHeight + that.$container.find('thead').height(),
                                    left: Math.min(fisrtItemPos.col, lastItemPos.col) * colWidth + that.$box.find('td')[0].getBoundingClientRect().width,
                                    width: (Math.abs(fisrtItemPos.col - lastItemPos.col) + 1) * colWidth,
                                    height: (Math.abs(fisrtItemPos.row - lastItemPos.row) + 1) * colHeight,
                                });
                        } else {
                            isMove = false;
                        }
                    }
                })
                .on('mouseup', '.time-item', function(e) {
                    var $target = $(e.target);

                    if (isMousedown && isMove) {
                        var selectData = that._selectRange(fisrtItemPos.row, parseInt(fisrtItemPos.col) + 1, $target.attr('data-time-row'), parseInt($target.attr('data-time-col')) + 1);
                        $('.select-mask').hide();
                        that.set(selectData);
                    }
                    isMousedown = false;
                });

            this.$container.on('click', 'button[target]', function() {
                var target = $(this).attr('target');
                that[target] && that[target]();
            })
            $(document).on('keydown', function(event) {
                isShift = event.which == 16;
            }).on('keyup', function(event) {
                isShift = false;
            }).on('mouseup', function(e) {
                var $target = $(e.target);
                if (isMousedown && isMove) {
                    var selectData = that._selectRange(fisrtItemPos.row, parseInt(fisrtItemPos.col) + 1, lastItemPos.row, parseInt(lastItemPos.col) + 1);
                    $('.select-mask').hide();
                    that.set(selectData);
                }
                isMousedown = false;
            });
        },
        /**
         * 获得选择范围
         * @example
         * same line 同一行
         * _selectRange(0,2,0,5);
         * 0-0
         * 2-5
         * return { 0:[ 2,3,4,5 ] }
         *
         * enjambment 跨行
         * _selectRange(0,2,3,23);
         * 0-3
         * 2-23
         * return { 
         * 		0:[ 2,3,4,5,...,23],
         * 		1:[ 2,3,4,5,...,23], 
         * 		2:[ 2,3,4,5,...,23], 
         * 		3:[ 2,3,4,5,...,23] 
         * }
         *
         * reverse selection 反向选择
         * _selectRange(3,5,0,2);
         * 0-3 
         * 2-5
         * return { 
         * 		0:[ 2,3,4,5],
         * 		1:[ 2,3,4,5], 
         * 		2:[ 2,3,4,5], 
         * 		3:[ 2,3,4,5] 
         * }
         * @param  {Number} lastRow 上一行
         * @param  {Number} lastCol 上一列
         * @param  {Number} row     行号
         * @param  {Number} col     类号
         * @return {object}         范围对象
         */
        _selectRange: function(lastRow, lastCol, row, col) {
            if (!lastRow || !lastCol || !row || !col) {
                return;
            }
            var _lastRow = Math.max(lastRow, row),
                _row = Math.min(lastRow, row),
                _lastCol = Math.max(lastCol, col),
                _col = Math.min(lastCol, col);

            var selectData = {},
                currentCol;
            do {
                currentCol = _col;
                selectData[_row + 1] = []
                do {
                    selectData[_row + 1].push(currentCol - 1);
                }
                while (currentCol++ != _lastCol);

            } while (_row++ != _lastRow)
            return selectData;
        },
        clear: function() {
            this.$box.find('tr td').removeClass('is-active');
            this.change();
            return this;
        },
        selectAll: function() {
            this.$box.find('tr td.time-item').addClass('is-active');
            this.change();
            return this;
        },
        /**
         * 反选
         * @return {[type]} 
         */
        reverse: function() {
            this.$box.find('.time-item').toggleClass('is-active');
            this.change();
            return this;
        },
        //周末
        weekend: function() {
            this.$box.find('tr .time-item').removeClass('is-active');
            this.$box.find('tr').eq('5').find('.time-item').addClass('is-active');
            this.$box.find('tr').eq('6').find('.time-item').addClass('is-active');
            this.change();
            return this;
        },
        //工作日
        workday: function() {
            this.$box.find('tr .time-item').removeClass('is-active');
            this.$box.find('tr').eq('0').find('.time-item').addClass('is-active');
            this.$box.find('tr').eq('1').find('.time-item').addClass('is-active');
            this.$box.find('tr').eq('2').find('.time-item').addClass('is-active');
            this.$box.find('tr').eq('3').find('.time-item').addClass('is-active');
            this.$box.find('tr').eq('4').find('.time-item').addClass('is-active');
            this.change();
            return this;
        },
        /**
         * 设置选中状态
         * @param {Object} data  
         * @param {Boolean} force 是否强制覆盖，默认 false，true则清空
         * 
         */
        set: function(data, force) {
            var k, i, len, tr;
            if (force) {
                this.clear();
            }
            for (k in data) {
                tr = this.$box.find('tr').eq(k == 0 ? 6 : k - 1);
                if (data[k]) {
                    len = data[k].length;
                    for (i = 0; i < len; i++) {
                        tr.find('td').eq(data[k][i] + 1).addClass('is-active');
                    }
                }

            };
            this.change();
            return this
        },
        get: function() {
            var result = {},
                _result = []
            this.$box.find('tr').each(function(index) {
                _result = [];
                $(this).find('td.time-item').each(function(_index) {
                    if ($(this).hasClass('is-active')) {
                        _result.push(_index);
                    }
                });
                if (_result.length != 0) {
                    result[index == 6 ? 0 : index + 1] = _result;
                }
            });

            return result;
        },
        disable: function(data) {
            if (data) {
                this._each(data, function(item, key, index) {
                    this.$box.find('tr').eq(key).find('td').eq(item).addClass('is-disable')
                });
            } else {
                this.$box.find('.time-item').addClass('is-disable')
            }
            return this;
        },
        /**
         * 遍历所有节点的方法
         * @privte
         * @param  {Function} callback 回调方法
         *                             item,key,index
         */
        _each(data, callback) {
            var data = data || this.get();

            for (var k in data) {
                $.each(data[k], function(item, index) {
                    callback && callback(item, k, index);
                })
            }
            return this;
        },
        humanize: function() {
            var list = TimeSelector.humanize(this.get());
            this.$container.find(".timeselector-select-result dd").remove();
            var $dd = $.map(list, function(item) {
                return '<dd>' + item + '</dd>'
            })
            this.$container.find(".timeselector-select-result").append($dd);
            return this;
        }
    }

    $.fn.timeSelector = function() {
        var _timeSelector = this.data('$timeSelector')

        if (!_timeSelector) {
            var option = arguments[0],
                options = $.extend({}, $.fn.timeSelector.defaults, option);

            _timeSelector = new TimeSelector(this[0], options);

            this.data('$timeSelector', _timeSelector);
        }
        return _timeSelector
    }

    $.fn.timeSelector.humanize = TimeSelector.humanize;

    $.fn.timeSelector.defaults = {
        defaultData: {}, //默认数据
        editMode: true, //编辑模式
    };

    $.fn.timeSelector.Constructor = TimeSelector;
}));