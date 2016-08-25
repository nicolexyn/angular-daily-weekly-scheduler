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