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