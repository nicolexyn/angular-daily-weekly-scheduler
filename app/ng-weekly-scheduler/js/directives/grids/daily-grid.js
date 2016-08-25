/*global GRID_TEMPLATE */
angular.module('weeklyScheduler')
  .directive('dailyGrid', [function () {

    function doGrid(element, attrs, model) {
      var monthLength = moment().month(model.month).endOf('month').date();
      var ticksize = 100 / monthLength;
      var gridItemEl = GRID_TEMPLATE.css({width: ticksize + '%'});

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
      require: '^weeklyScheduler',
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