angular.module('demoApp', ['ngAnimate', 'scheduler', 'schedulerI18N'])

  .config(['schedulerLocaleServiceProvider', function (localeServiceProvider) {
    localeServiceProvider.configure({
      doys: {'es-es': 4},
      lang: {'es-es': {month: 'Mes', weekNb: 'número de la semana', addNew: 'Añadir'}},
      localeLocationPattern: '/vendor/angular-i18n/angular-locale_{{locale}}.js'
    });
  }])

  .controller('DemoController', ['$scope', '$timeout', 'schedulerLocaleService', '$log',
    function ($scope, $timeout, localeService, $log) {

      $scope.model = {
        locale: localeService.$locale.id,
        options: {
          month: 0,
          year: 2015,
          type: 'DAILY',
          denyResize: true,
          ignoreOverlaps: true,
          denyDelete: true,
          hideAllocationText: true,
          defaultAllocationColor: '#B5180F',
          clickEvent: function (data) {
            console.log(data);
            data.color = '#20B507';
          }
        },
        items: [{
          label: 'Item 1',
          editable: false,
          schedules: [
            {start: moment('2015-01-10').toDate(), end: moment('2015-01-11').toDate(), color: "#b50098"}
          ]
        }]
      };

      $timeout(function () {
        $scope.model.items = $scope.model.items.concat([{
          label: 'Item 2',
          schedules: [
            {start: moment('2016-05-03').toDate(), end: moment('2017-02-01').toDate()},
            {start: moment('2015-11-20').toDate(), end: moment('2016-02-01').toDate()}
          ]
        }, {
          label: 'Item 3',
          schedules: [
            {start: moment('2017-08-09').toDate(), end: moment('2017-08-21').toDate()},
            {start: moment('2017-09-12').toDate(), end: moment('2017-10-12').toDate()}
          ]
        }]);
      }, 1000);

      this.doSomething = function (itemIndex, scheduleIndex, scheduleValue) {
        $log.debug('The model has changed!', itemIndex, scheduleIndex, scheduleValue);
      };

      this.onLocaleChange = function () {
        $log.debug('The locale is changing to', $scope.model.locale);
        localeService.set($scope.model.locale).then(function ($locale) {
          $log.debug('The locale changed to', $locale.id);
        });
      };
    }]);