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