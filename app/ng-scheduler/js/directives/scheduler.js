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