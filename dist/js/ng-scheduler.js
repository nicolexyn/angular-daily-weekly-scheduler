;(function( window, undefined ){ 
 'use strict';

angular.module('scheduler', ['ngSchedulerTemplates']);

/* jshint -W098 */
var GRID_TEMPLATE = angular.element('<div class="grid-item"></div>');

var isCtrl;

function ctrlCheck(e) {
  if (e.which === 17) {
    isCtrl = e.type === 'keydown';
  }
}

function mouseScroll(el, delta) {

  window.addEventListener('keydown', ctrlCheck);
  window.addEventListener('keyup', ctrlCheck);

  el.addEventListener('mousewheel', function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (isCtrl) {
      var style = el.firstChild.style, currentWidth = parseInt(style.width);
      if ((e.wheelDelta || e.detail) > 0) {
        style.width = (currentWidth + 2 * delta) + '%';
      } else {
        var width = currentWidth - 2 * delta;
        style.width = (width > 100 ? width : 100) + '%';
      }
    } else {
      if ((e.wheelDelta || e.detail) > 0) {
        el.scrollLeft -= delta;
      } else {
        el.scrollLeft += delta;
      }
    }
    return false;
  });
}
/*jshint +W098 */
/*global GRID_TEMPLATE */
angular.module('scheduler')
  .directive('dailyGrid', [function () {

    function doGrid(element, attrs, model) {
      var monthLength = moment().month(model.month).endOf('month').date();
      var ticksize = 100 / monthLength;
      var gridCss = {
        width: ticksize + '%',
        'border-right': '1px solid #ccc'
      };
      var gridItemEl = GRID_TEMPLATE.css(gridCss);

      // Clean element
      element.empty();

      for (var i = 1; i <= monthLength; i++) {
        var child = gridItemEl.clone();
        if (angular.isUndefined(attrs.noText)) {
          child.text(i);
        }
        element.append(child);
      }
    }

    return {
      restrict: 'E',
      require: '^scheduler',
      link: function (scope, element, attrs, schedulerCtrl) {
        if (schedulerCtrl.config) {
          doGrid(element, attrs, schedulerCtrl.config);
        }
        schedulerCtrl.$modelChangeListeners.push(function (newModel) {
          doGrid(element, attrs, newModel);
        });
      }
    };
  }]);
/*global GRID_TEMPLATE */
angular.module('scheduler')
  .directive('monthlyGrid', ['schedulerTimeService', function (timeService) {

    function doGrid(element, attrs, model) {
      // Clean element
      element.empty();

      // Calculation month distribution
      var months = timeService.monthDistribution(model.minDate, model.maxDate);

      // Deploy the grid system on element
      months.forEach(function (month) {
        var child = GRID_TEMPLATE.clone().css({width: month.width + '%'});
        if (angular.isUndefined(attrs.noText)) {
          child.text(timeService.dF(month.start.toDate(), 'MMM yyyy'));
        }
        element.append(child);
      });
    }

    return {
      restrict: 'E',
      require: '^scheduler',
      link: function (scope, element, attrs, schedulerCtrl) {
        schedulerCtrl.$modelChangeListeners.push(function (newModel) {
          doGrid(element, attrs, newModel);
        });
      }
    };
  }]);
/*global GRID_TEMPLATE */
angular.module('scheduler')
  .directive('weeklyGrid', [function () {

    function doGrid(element, attrs, model) {
      var i;
      // Calculate week width distribution
      var tickcount = model.nbWeeks;
      var ticksize = 100 / tickcount;
      var gridItemEl = GRID_TEMPLATE.css({width: ticksize + '%'});
      var now = model.minDate.clone().startOf('week');

      // Clean element
      element.empty();

      for (i = 0; i < tickcount; i++) {
        var child = gridItemEl.clone();
        if (angular.isUndefined(attrs.noText)) {
          child.text(now.add(i && 1, 'week').week());
        }
        element.append(child);
      }
    }

    return {
      restrict: 'E',
      require: '^scheduler',
      link: function (scope, element, attrs, schedulerCtrl) {
        if (schedulerCtrl.config) {
          doGrid(element, attrs, schedulerCtrl.config);
        }
        schedulerCtrl.$modelChangeListeners.push(function (newModel) {
          doGrid(element, attrs, newModel);
        });
      }
    };
  }]);
angular.module('scheduler')
  .directive('handle', ['$document', function ($document) {
    return {
      restrict: 'A',
      scope: {
        ondrag: '=',
        ondragstop: '=',
        ondragstart: '='
      },
      link: function (scope, element) {

        var x = 0;

        element.on('mousedown', function (event) {
          // Prevent default dragging of selected content
          event.preventDefault();

          x = event.pageX;

          $document.on('mousemove', mousemove);
          $document.on('mouseup', mouseup);

          if (scope.ondragstart) {
            scope.ondragstart();
          }
        });

        function mousemove(event) {
          var delta = event.pageX - x;
          if (scope.ondrag) {
            scope.ondrag(delta);
          }
        }

        function mouseup() {
          $document.unbind('mousemove', mousemove);
          $document.unbind('mouseup', mouseup);

          if (scope.ondragstop) {
            scope.ondragstop();
          }
        }
      }
    };
  }]);
angular.module('scheduler')
  .directive('inject', [function () {

    return {
      link: function ($scope, $element, $attrs, controller, $transclude) {
        if (!$transclude) {
          throw 'Illegal use of ngTransclude directive in the template! No parent directive that requires a transclusion found.';
        }
        var innerScope = $scope.$new();
        $transclude(innerScope, function (clone) {
          $element.empty();
          $element.append(clone);
          $element.on('$destroy', function () {
            innerScope.$destroy();
          });
        });
      }
    };
  }]);
angular.module('scheduler')

  .filter('byIndex', [function () {
    return function (input, index) {
      var ret = [];
      angular.forEach(input, function (el) {
        if (el.index === index) {
          ret.push(el);
        }
      });
      return ret;
    };
  }])

  .directive('multiSlider', ['schedulerTimeService', 'schedulerService' , function (timeService, schedulerService) {
    return {
      restrict: 'E',
      require: '^scheduler',
      templateUrl: 'ng-scheduler/views/multi-slider.html',
      link: function (scope, element, attrs, schedulerCtrl) {
        var conf = schedulerCtrl.config;

        scope.config = conf;

        // The default scheduler block size when adding a new item
        var defaultNewScheduleSize = parseInt(attrs.size) || 8;
        defaultNewScheduleSize = schedulerService.isDailyScheduler(conf) ? 1 : defaultNewScheduleSize;

        var totalPartitions = schedulerService.isDailyScheduler(conf) ? conf.nbDays : conf.nbWeeks;

        var valToPixel = function (val) {
          var percent = val / totalPartitions;
          return Math.floor(percent * element[0].clientWidth + 0.5);
        };

        var pixelToVal = function (pixel) {
          var percent = pixel / element[0].clientWidth;
          return Math.floor(percent * (totalPartitions) + 0.5);
        };

        var addSlot = function (start, end) {
          if (schedulerService.isWeeklyScheduler(conf)) {
            start = start >= 0 ? start : 0;
            end = end <= conf.nbWeeks ? end : conf.nbWeeks;
            var startDate = timeService.addWeek(conf.minDate, start);
            var endDate = timeService.addWeek(conf.minDate, end);
          } else if (schedulerService.isDailyScheduler(conf)) {
            start = start > 0 ? start : 1;
            startDate = angular.copy(conf.minDate).date(start);
            endDate = angular.copy(conf.minDate).date(end);
            if (startDate.isSame(endDate)) {
              endDate = timeService.addDay(endDate, 1);
            }
          }

          scope.$apply(function () {
            var item = scope.item;
            if (!item.schedules) {
              item.schedules = [];
            }
            var schedule = {start: startDate.toDate(), end: endDate.toDate()};
            item.schedules.push(schedule);
            conf.clickEvent ? conf.clickEvent(schedule) : angular.noop();
          });
        };

        scope.getSlotColor = function (slot) {
          if (slot.color || conf.defaultAllocationColor) {
            return {"background-color": (slot.color || conf.defaultAllocationColor)}
          }
        };

        scope.parseScheduleData = function (scheduleData) {
          var schedule = JSON.parse(scheduleData);
          if (schedule.start) {
            schedule.start = new Date(schedule.start);
          }

          if (schedule.end) {
            schedule.end = new Date(schedule.end);
          }

          conf.clickEvent ? conf.clickEvent(schedule) : angular.noop();
        };

        scope.getSliderText = function () {
          if (schedulerService.isDailyScheduler(conf)) {
            return '+'
          } else if (schedulerService.isWeeklyScheduler(conf)) {
            return conf.labels.addNew || 'Add New'
          }
        };

        var hoverElement = angular.element(element.find('div')[0]);
        var hoverElementWidth = valToPixel(defaultNewScheduleSize);
        schedulerService.isDailyScheduler(conf) ? hoverElementWidth -= 7 : angular.noop();

        hoverElement.css({
          width: hoverElementWidth + 'px'
        });

        element.on('mousemove', function (e) {
          var elOffX = element[0].getBoundingClientRect().left;
          var blockSize = element[0].getBoundingClientRect().width / conf.nbDays;

          var position = Math.floor(e.pageX/blockSize) * blockSize;

          var hoverElmLeft = e.pageX - elOffX - hoverElementWidth / 2 + 'px';
          if (schedulerService.isDailyScheduler(conf)) {
            hoverElmLeft = position - elOffX - 4 + 'px';
          }
          hoverElement.css({
            left: hoverElmLeft
          });
        });

        hoverElement.on('click', function (event) {
          if (!element.attr('no-add')) {
            var elOffX = element[0].getBoundingClientRect().left;
            var pixelOnClick = event.pageX - elOffX;

            if (schedulerService.isDailyScheduler(conf)) {
              var blockSize = element[0].getBoundingClientRect().width / conf.nbDays;
              var hoverElementPos = Math.ceil(event.pageX / blockSize) * blockSize;
              pixelOnClick = hoverElementPos  - elOffX
            }

            var valOnClick = pixelToVal(pixelOnClick);

            var start = valOnClick;
            if (schedulerService.isWeeklyScheduler(conf)) {
              start = Math.round(valOnClick - defaultNewScheduleSize / 2);
            }
            var end = start + defaultNewScheduleSize;

            addSlot(start, end);
          }
        });
      }
    };
  }]);
angular.module('scheduler')

  .directive('scheduleSlot', ['schedulerTimeService', 'schedulerService', '$filter', function (timeService, schedulerService, $filter) {
    return {
      restrict: 'E',
      require: ['^scheduler', 'ngModel'],
      templateUrl: 'ng-scheduler/views/schedule-slot.html',
      link: function (scope, element, attrs, ctrls) {
        var schedulerCtrl = ctrls[0], ngModelCtrl = ctrls[1];
        var conf = schedulerCtrl.config;
        var index = scope.$parent.$index;
        var containerEl = element.parent();
        var resizeDirectionIsStart = true;
        var valuesOnDragStart = {start: scope.schedule.start, end: scope.schedule.end};

        scope.config = conf;

        var totalPartitions = schedulerService.isDailyScheduler(conf) ? conf.nbDays : conf.nbWeeks;

        var pixelToVal = function (pixel) {
          var percent = pixel / containerEl[0].clientWidth;
          return Math.floor(percent * totalPartitions + 0.5);
        };

        var mergeOverlaps = function () {
          var schedule = scope.schedule;
          var schedules = scope.item.schedules;
          schedules.forEach(function (el) {
            if (el !== schedule) {
              // model is inside another slot
              if (el.end >= schedule.end && el.start <= schedule.start) {
                schedules.splice(schedules.indexOf(el), 1);
                schedule.end = el.end;
                schedule.start = el.start;
              }
              // model completely covers another slot
              else if (schedule.end >= el.end && schedule.start <= el.start) {
                schedules.splice(schedules.indexOf(el), 1);
              }
              // another slot's end is inside current model
              else if (el.end >= schedule.start && el.end <= schedule.end) {
                schedules.splice(schedules.indexOf(el), 1);
                schedule.start = el.start;
              }
              // another slot's start is inside current model
              else if (el.start >= schedule.start && el.start <= schedule.end) {
                schedules.splice(schedules.indexOf(el), 1);
                schedule.end = el.end;
              }
            }
          });
        };

        scope.getSlotText = function(schedule) {
          var text = '';
          if (!conf.hideAllocationText) {
            text = $filter('date')(schedule.start) + ' - ' + $filter('date')(schedule.end);
          }
          return text;
        };

        /**
         * Delete on right click on slot
         */
        var deleteSelf = function () {
          containerEl.removeClass('dragging');
          containerEl.removeClass('slot-hover');
          scope.item.schedules.splice(scope.item.schedules.indexOf(scope.schedule), 1);
          containerEl.find('schedule-slot').remove();
          scope.$apply();
        };

        element.find('span').on('click', function (e) {
          e.preventDefault();
          deleteSelf();
        });

        element.on('mouseover', function () {
          containerEl.addClass('slot-hover');
        });

        element.on('mouseleave', function () {
          containerEl.removeClass('slot-hover');
        });


        if (scope.item.editable !== false) {
          scope.startResizeStart = function () {
            if (!conf.denyResize) {
              resizeDirectionIsStart = true;
              scope.startDrag();
            }
          };

          scope.startResizeEnd = function () {
            if (!conf.denyResize) {
              resizeDirectionIsStart = false;
              scope.startDrag();
            }
          };

          scope.startDrag = function () {
            element.addClass('active');

            containerEl.addClass('dragging');
            containerEl.attr('no-add', true);

            valuesOnDragStart = {start: ngModelCtrl.$viewValue.start, end: ngModelCtrl.$viewValue.end};
          };

          scope.endDrag = function () {

            // this prevents user from accidentally
            // adding new slot after resizing or dragging
            setTimeout(function () {
              containerEl.removeAttr('no-add');
            }, 500);

            element.removeClass('active');
            containerEl.removeClass('dragging');

            !conf.ignoreOverlaps ? mergeOverlaps() : angular.noop();
            scope.$apply();
          };

          scope.resize = function (d) {
            var ui = ngModelCtrl.$viewValue;
            var delta = pixelToVal(d);

            if (resizeDirectionIsStart) {
              var newStart = Math.round(valuesOnDragStart.start + delta);

              if (ui.start !== newStart && newStart <= ui.end - 1 && newStart >= 0) {
                ngModelCtrl.$setViewValue({
                  start: newStart,
                  end: ui.end
                });
                ngModelCtrl.$render();
              }
            } else {
              var newEnd = Math.round(valuesOnDragStart.end + delta);

              if (ui.end !== newEnd && newEnd >= ui.start + 1 && newEnd <= totalPartitions) {
                ngModelCtrl.$setViewValue({
                  start: ui.start,
                  end: newEnd
                });
                ngModelCtrl.$render();
              }
            }
          };

          scope.drag = function (d) {
            var ui = ngModelCtrl.$viewValue;
            var delta = pixelToVal(d);
            var duration = valuesOnDragStart.end - valuesOnDragStart.start;

            var newStart = Math.round(valuesOnDragStart.start + delta);
            var newEnd = Math.round(newStart + duration);

            if (ui.start !== newStart && newStart >= 0 && newEnd <= totalPartitions) {
              ngModelCtrl.$setViewValue({
                start: newStart,
                end: newEnd
              });
              ngModelCtrl.$render();
            }
          };
        }

        // on init, merge overlaps
        !conf.ignoreOverlaps ? mergeOverlaps(true) : angular.noop();

        //// UI -> model ////////////////////////////////////
        ngModelCtrl.$parsers.push(function onUIChange(ui) {
          ngModelCtrl.$modelValue.start = timeService.addWeek(conf.minDate, ui.start).toDate();
          ngModelCtrl.$modelValue.end = timeService.addWeek(conf.minDate, ui.end).toDate();
          //$log.debug('PARSER :', ngModelCtrl.$modelValue.$$hashKey, index, scope.$index, ngModelCtrl.$modelValue);
          schedulerCtrl.on.change(index, scope.$index, ngModelCtrl.$modelValue);
          return ngModelCtrl.$modelValue;
        });

        //// model -> UI ////////////////////////////////////
        ngModelCtrl.$formatters.push(function onModelChange(model) {
          var ui = {
            start: schedulerService.isDailyScheduler(conf) ? timeService.dayDiff(conf.minDate, moment(model.start)) : timeService.weekPreciseDiff(conf.minDate, moment(model.start), true),
            end: schedulerService.isDailyScheduler(conf) ? timeService.dayDiff(conf.minDate, moment(model.end)) : timeService.weekPreciseDiff(conf.minDate, moment(model.start), true)
          };
          return ui;
        });

        ngModelCtrl.$render = function () {
          var ui = ngModelCtrl.$viewValue;
          var css = {
            left: ui.start / totalPartitions * 100 + '%',
            width: (ui.end - ui.start) / totalPartitions * 100 + '%'
          };

          element.css(css);
        };

        scope.$on('schedulerLocaleChanged', function () {
          // Simple change object reference so that ngModel triggers formatting & rendering
          scope.schedule = angular.copy(scope.schedule);
        });
      }
    };
  }]);
/*global mouseScroll */
angular.module('scheduler')

  .directive('scheduler', ['$parse', 'schedulerTimeService', '$log', 'schedulerService', function ($parse, timeService, $log, schedulerService) {

    var defaultOptions = {
      monoSchedule: false,
      selector: '.schedule-area-container'
    };

    /**
     * Configure the scheduler.
     * @param schedules
     * @param options
     * @returns {{minDate: *, maxDate: *, nbWeeks: *}}
     */

    function getDateByOptions(options) {
      return timeService.getDate(null, options.month, options.year);
    }

    function getMinDate(schedules, options) {
      var now = timeService.getDate();
      if (!angular.isUndefined(options.month)) {
        return getDateByOptions(options).startOf('month');
      } else {
        return (schedules ? schedules.reduce(function (minDate, slot) {
          return timeService.compare(slot.start, 'isBefore', minDate);
        }, now) : now).startOf('week')
      }
    }

    function getMaxDate(schedules, options) {
      var now = timeService.getDate();
      if (!angular.isUndefined(options.month)) {
        return getDateByOptions(options).endOf('month');
      } else {
        return (schedules ? schedules.reduce(function (maxDate, slot) {
          return timeService.compare(slot.end, 'isAfter', maxDate);
        }, now) : now).clone().add(1, 'year').endOf('week')
      }
    }

    function config(schedules, options) {
      // Calculate min date of all scheduled events
      var minDate = getMinDate(schedules, options);

      // Calculate max date of all scheduled events
      var maxDate = getMaxDate(schedules, options);

      // Calculate nb of weeks covered by minDate => maxDate
      var nbWeeks = timeService.weekDiff(minDate, maxDate);

      // Get the number of days of the selected month
      var nbDays = schedulerService.isDailyScheduler(options) ? getDateByOptions(options).endOf('month').date() : 0;

      var result = angular.extend(options, {minDate: minDate, maxDate: maxDate, nbWeeks: nbWeeks, nbDays: nbDays});
      // Log configuration
      $log.debug('Weekly Scheduler configuration:', result);

      return result;
    }

    return {
      restrict: 'E',
      require: 'scheduler',
      transclude: true,
      templateUrl: 'ng-scheduler/views/scheduler.html',
      controller: ['$injector', 'schedulerService', function ($injector, schedulerService) {
        // Try to get the i18n service
        var name = 'schedulerLocaleService';
        if ($injector.has(name)) {
          $log.info('The I18N service has successfully been initialized!');
          var localeService = $injector.get(name);
          defaultOptions.labels = localeService.getLang();
        } else {
          $log.info('No I18N found for this module, check the ng module [weeklySchedulerI18N] if you need i18n.');
        }

        // Will hang our model change listeners
        this.$modelChangeListeners = [];
        this.schedulerService = schedulerService;
      }],
      controllerAs: 'schedulerCtrl',
      link: function (scope, element, attrs, schedulerCtrl) {
        var optionsFn = $parse(attrs.options),
          options = angular.extend(defaultOptions, optionsFn(scope) || {});

        // Get the schedule container element
        var el = element[0].querySelector(defaultOptions.selector);

        scope.isWeeklyScheduler = function() {
          return schedulerCtrl.schedulerService.isWeeklyScheduler(options);
        };

        scope.isDailyScheduler = function() {
          return schedulerCtrl.schedulerService.isDailyScheduler(options);
        };

        function onModelChange(items) {
          // Check items are present
          if (items) {

            // Check items are in an Array
            if (!angular.isArray(items)) {
              throw 'You should use weekly-scheduler directive with an Array of items';
            }

            // Keep track of our model (use it in template)
            schedulerCtrl.items = items;

            // First calculate configuration
            schedulerCtrl.config = config(items.reduce(function (result, item) {
              var schedules = item.schedules;

              return result.concat(schedules && schedules.length ?
                // If in multiSlider mode, ensure a schedule array is present on each item
                // Else only use first element of schedule array
                (options.monoSchedule ? item.schedules = [schedules[0]] : schedules) :
                item.schedules = []
              );
            }, []), options);

            // Then resize schedule area knowing the number of weeks in scope
            el.firstChild.style.width = angular.isUndefined(options.month) ? schedulerCtrl.config.nbWeeks / 53 * 200 + '%' : '100%' ;

            // Finally, run the sub directives listeners
            schedulerCtrl.$modelChangeListeners.forEach(function (listener) {
              listener(schedulerCtrl.config);
            });
          }
        }

        if (el) {
          // Install mouse scrolling event listener for H scrolling
          mouseScroll(el, 20);

          schedulerCtrl.on = {
            change: function (itemIndex, scheduleIndex, scheduleValue) {
              var onChangeFunction = $parse(attrs.onChange)(scope);
              if (angular.isFunction(onChangeFunction)) {
                return onChangeFunction(itemIndex, scheduleIndex, scheduleValue);
              }
            }
          };

          /**
           * Watch the model items
           */
          scope.$watchCollection(attrs.items, onModelChange);

          /**
           * Listen to $locale change (brought by external module weeklySchedulerI18N)
           */
          scope.$on('schedulerLocaleChanged', function (e, labels) {
            if (schedulerCtrl.config) {
              schedulerCtrl.config.labels = labels;
            }
            onModelChange(angular.copy($parse(attrs.items)(scope), []));
          });
        }
      }
    };
  }]);
angular.module('schedulerI18N', ['tmh.dynamicLocale']);

angular.module('schedulerI18N')
  .provider('schedulerLocaleService', ['tmhDynamicLocaleProvider', function (tmhDynamicLocaleProvider) {

    var defaultConfig = {
      doys: {'de-de': 4, 'en-gb': 4, 'en-us': 6, 'fr-fr': 4, 'pt-br': 4},
      lang: {
        'de-de': {month: 'Monat', weekNb: 'Wochenummer', dayNb: 'Tag', addNew: 'Hinzufügen'},
        'en-gb': {month: 'Month', weekNb: 'Week #', dayNb: 'Day #', addNew: 'Add'},
        'en-us': {month: 'Month', weekNb: 'Week #', dayNb: 'Day #', addNew: 'Add'},
        'fr-fr': {month: 'Mois', weekNb: 'N° de semaine', dayNb: 'Jour', addNew: 'Ajouter'},
        'pt-br': {month: 'Mês', weekNb: 'N° da semana', dayNb: 'Dia' , addNew: 'Adicionar'}
      }
    };

    this.configure = function (config) {

      if (config && angular.isObject(config)) {
        angular.merge(defaultConfig, config);

        if (defaultConfig.localeLocationPattern) {
          tmhDynamicLocaleProvider.localeLocationPattern(defaultConfig.localeLocationPattern);
        }
      }
    };

    this.$get = ['$rootScope', '$locale', 'tmhDynamicLocale', function ($rootScope, $locale, tmhDynamicLocale) {

      var momentLocaleCache = {};

      function getLang() {
        var key = $locale.id;
        if (!momentLocaleCache[key]) {
          momentLocaleCache[key] = getMomentLocale(key);
          moment.locale(momentLocaleCache[key].id, momentLocaleCache[key].locale);
        } else {
          moment.locale(momentLocaleCache[key].id);
        }
        return defaultConfig.lang[key];
      }

      // We just need few moment local information
      function getMomentLocale(key) {
        return {
          id: key,
          locale: {
            week: {
              // Angular monday = 0 whereas Moment monday = 1
              dow: ($locale.DATETIME_FORMATS.FIRSTDAYOFWEEK + 1) % 7,
              doy: defaultConfig.doys[key]
            }
          }
        };
      }

      $rootScope.$on('$localeChangeSuccess', function () {
        $rootScope.$broadcast('schedulerLocaleChanged', getLang());
      });

      return {
        $locale: $locale,
        getLang: getLang,
        set: function (key) {
          return tmhDynamicLocale.set(key);
        }
      };
    }];
  }]);
angular.module('scheduler')
  .service('schedulerService', [function () {

    var WEEKLY_SCHEDULER = 'WEEKLY';
    var DAILY_SCHEDULER = 'DAILY';

    return {
      const: {
        WEEKLY: WEEKLY_SCHEDULER,
        DAILY: DAILY_SCHEDULER
      },
      isWeeklyScheduler : function (options) {
        return angular.isUndefined(options.type) || options.type === WEEKLY_SCHEDULER;
      },
      isDailyScheduler : function (options) {
        return options.type === DAILY_SCHEDULER;
      }
    };
  }]);
angular.module('scheduler')
  .service('schedulerTimeService', ['$filter', function ($filter) {

    var MONTH = 'month';
    var WEEK = 'week';
    var DAY = 'day';
    var DAYS = 'days';

    return {
      const: {
        MONTH: MONTH,
        WEEK: WEEK,
        FORMAT: 'YYYY-MM-DD'
      },
      dF: $filter('date'),
      compare: function (date, method, lastMin) {
        if (date) {
          var dateAsMoment;
          if (angular.isDate(date)) {
            dateAsMoment = moment(date);
          } else if (date._isAMomentObject) {
            dateAsMoment = date;
          } else {
            throw 'Could not parse date [' + date + ']';
          }
          return dateAsMoment[method](lastMin) ? dateAsMoment : lastMin;
        }
      },
      addWeek: function (moment, nbWeek) {
        return moment.clone().add(nbWeek, WEEK);
      },
      addDay: function (moment, nbDay) {
        return moment.clone().add(nbDay, DAY);
      },
      weekPreciseDiff: function (start, end) {
        return end.clone().diff(start.clone(), WEEK, true);
      },
      weekDiff: function (start, end) {
        return end.clone().endOf(WEEK).diff(start.clone().startOf(WEEK), WEEK) + 1;
      },
      monthDiff: function (start, end) {
        return end.clone().endOf(MONTH).diff(start.clone().startOf(MONTH), MONTH) + 1;
      },
      dayDiff: function (start, end) {
        return end.diff(start, DAYS);
      },
      monthDistribution: function (minDate, maxDate) {
        var i, result = [];
        var startDate = minDate.clone();
        var endDate = maxDate.clone();
        var monthDiff = this.monthDiff(startDate, endDate);
        var dayDiff = endDate.diff(startDate, DAY);

        for (i = 0; i < monthDiff; i++) {
          var startOfMonth = i === 0 ? startDate : startDate.add(1, MONTH).startOf(MONTH);
          var endOfMonth = i === monthDiff - 1 ? endDate : startDate.clone().endOf(MONTH);
          var dayInMonth = endOfMonth.diff(startOfMonth, DAY) + (i !== monthDiff - 1 && 1);
          var width = Math.floor(dayInMonth / dayDiff * 1E8) / 1E6;

          result.push({start: startOfMonth.clone(), end: endOfMonth.clone(), width: width});
        }
        return result;
      },
      getDate: function(day, month, year) {
        var date = moment();
        date = day ? date.day(day) : date;
        date = !angular.isUndefined(month) ? date.month(month) : date;
        date = year ? date.year(year) : date;

        return date;
      }
    };
  }]);
angular.module('ngSchedulerTemplates', ['ng-scheduler/views/multi-slider.html', 'ng-scheduler/views/schedule-slot.html', 'ng-scheduler/views/scheduler.html']);

angular.module('ng-scheduler/views/multi-slider.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('ng-scheduler/views/multi-slider.html',
    '<div class="slot ghost" ng-show="item.editable !== false && (!schedulerCtrl.config.monoSchedule || !item.schedules.length)">{{getSliderText()}}</div><schedule-slot ng-style=getSlotColor(schedule) class=slot ng-class="{disable: item.editable === false}" ng-repeat="schedule in item.schedules" ng-model=schedule onclick=angular.element(this).scope().parseScheduleData(this.firstElementChild.attributes.data.value) ng-model-options="{ updateOn: \'default blur\', debounce: { \'default\': 500, \'blur\': 0 } }"></schedule-slot>');
}]);

angular.module('ng-scheduler/views/schedule-slot.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('ng-scheduler/views/schedule-slot.html',
    '<div title="{{schedule.start | date}} - {{schedule.end | date}}" data={{schedule}}><div ng-if=!config.denyResize class="handle left" ondrag=resize ondragstart=startResizeStart ondragstop=endDrag handle></div><div ondrag=drag ondragstart=startDrag ondragstop=endDrag handle>{{getSlotText(schedule)}}</div><div ng-if=!config.denyResize class="handle right" ondrag=resize ondragstart=startResizeEnd ondragstop=endDrag handle></div><div ng-if=!config.denyDelete class=remove><span class="glyphicon glyphicon-remove"></span></div></div>');
}]);

angular.module('ng-scheduler/views/scheduler.html', []).run(['$templateCache', function($templateCache) {
  $templateCache.put('ng-scheduler/views/scheduler.html',
    '<div class=labels><div class="srow text-right">{{schedulerCtrl.config.labels.month || \'Month\'}}</div><div ng-if=isWeeklyScheduler() class="srow text-right">{{schedulerCtrl.config.labels.weekNb || \'Week number\'}}</div><div ng-if=isDailyScheduler() class="srow text-right">{{schedulerCtrl.config.labels.dayNb || \'Day number\'}}</div><div class=schedule-animate ng-repeat="item in schedulerCtrl.items" inject></div></div><div class=schedule-area-container><div class=schedule-area><div class="srow timestamps"><monthly-grid class=grid-container></monthly-grid></div><div class="srow timestamps"><weekly-grid ng-if=isWeeklyScheduler() class=grid-container></weekly-grid><daily-grid ng-if=isDailyScheduler() class=grid-container></daily-grid></div><div class="srow schedule-animate" ng-repeat="item in schedulerCtrl.items"><weekly-grid ng-if=isWeeklyScheduler() class="grid-container striped" no-text></weekly-grid><daily-grid ng-if=isDailyScheduler() class="grid-container striped" no-text></daily-grid><multi-slider index={{$index}}></multi-slider></div></div></div>');
}]);
}( window ));