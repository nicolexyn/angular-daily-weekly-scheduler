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
            item.schedules.push({start: startDate.toDate(), end: endDate.toDate()});
          });
        };

        var hoverElement = angular.element(element.find('div')[0]);
        var hoverElementWidth = valToPixel(defaultNewScheduleSize);

        hoverElement.css({
          width: hoverElementWidth + 'px'
        });

        element.on('mousemove', function (e) {
          var elOffX = element[0].getBoundingClientRect().left;

          hoverElement.css({
            left: e.pageX - elOffX - hoverElementWidth / 2 + 'px'
          });
        });

        hoverElement.on('click', function (event) {
          if (!element.attr('no-add')) {
            var elOffX = element[0].getBoundingClientRect().left;
            var pixelOnClick = event.pageX - elOffX;
            var valOnClick = pixelToVal(pixelOnClick);

            var start = Math.round(valOnClick - defaultNewScheduleSize / 2);
            var end = start + defaultNewScheduleSize;

            addSlot(start, end);
          }
        });
      }
    };
  }]);