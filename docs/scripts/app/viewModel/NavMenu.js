define([ "jquery", "lodash", "footwork" ],
  function( $, _, fw ) {
    var viewPortIsMobile = fw.observable().receiveFrom('ViewPort', 'isMobile');

    var Entry = fw.viewModel({
      namespace: 'PaneElements',
      initialize: function(entryData) {
        this.headerContentHeight = fw.observable().receiveFrom('Header', 'contentHeight');
        this.visible = fw.observable( null ).extend({ autoEnable: _.random( 200, 600 ) });
        this.paneCollapsed = fw.observable().receiveFrom('Configuration', 'paneCollapsed').extend({ debounce: { timeout: 200, when: function(collapsed) { return collapsed === false; } } });
        this.labelText = fw.observable( entryData.label );
        this.url = fw.observable( entryData.url );
        this.options = entryData || {};
        this.subMenuItems = entryData.subMenu;
        this.hasSubMenu = _.isArray(entryData.subMenu) && !!entryData.subMenu.length;
        this.target = entryData.target;

        this.clickHandler = function(event, url) {
          var routeToURL = false;
          if(!viewPortIsMobile() || !this.paneCollapsed()) {
            routeToURL = true;
          }
          if( !fw.isFullURL(url) ) {
            event.preventDefault();
          }
          return routeToURL;
        };

        this.$namespace.subscribe('hideAll', function() {
          this.visible( false );
        }).withContext(this);

        this.visible( false );
      }
    });

    return fw.viewModel({
      namespace: 'NavMenu',
      initialize: function() {
        this.visible = fw.observable(false);
        this.paneWidth = fw.observable().receiveFrom('Pane', 'width');
        this.currentSelection = fw.observable().receiveFrom('PaneLinks', 'currentSelection');
        this.paneContentMaxHeight = fw.observable().receiveFrom('Pane', 'contentMaxHeight').extend({ units: 'px' });
        this.headerContentHeight = fw.observable().receiveFrom('Header', 'contentHeight');
        this.configVisible = fw.observable().receiveFrom('Configuration', 'visible');
        this.paneCollapsed = fw.observable().receiveFrom('Configuration', 'paneCollapsed');

        this.toggleConfigView = function() {
          this.configVisible( !this.configVisible() );
          if( this.configVisible() && this.paneCollapsed() ) {
            this.paneCollapsed(false);
          }
        }.bind( this );

        this.mobileWidth = fw.computed(function() {
          return (parseInt(this.paneWidth(), 10) - 20) + 'px';
        }, this);
        this.visible = fw.observable(false);
        this.entries = fw.observableArray([
          new Entry({ label: 'API Docs', url: '/api', subMenu: [
            new Entry({ label: 'viewModel', url: '/api/viewModel' }),
            new Entry({ label: 'Namespace', url: '/api/namespace' }),
            new Entry({ label: 'Components', url: '/api/component' }),
            new Entry({ label: 'Broadcastable / Receivable', url: '/api/broadcast-receive' }),
            new Entry({ label: 'Routing', url: '/api/routing' }),
          ] }),
          new Entry({ label: 'Tutorial', url: '/tutorial' }),
          new Entry({ label: 'Annotated Source', url: '/annotated' })
        ]);

        this.checkSelection = function(newSelection) {
          newSelection = newSelection || this.currentSelection();
          this.visible( newSelection === this.getNamespaceName() );
        };
        this.currentSelection.subscribe(this.checkSelection, this);
        
        this.checkSelection();
      }
    });
  }
);