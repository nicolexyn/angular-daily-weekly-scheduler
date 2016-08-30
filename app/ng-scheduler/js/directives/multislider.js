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