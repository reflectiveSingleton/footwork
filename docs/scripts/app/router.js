define([ "jquery", "footwork", "lodash", "jquery.collapsible" ],
  function( $, fw, _ ) {
    var $pageNamespace = fw.namespace('Page');
    var $pageSectionNamespace = fw.namespace('PageSection');
    var $paneElementsNamespace = fw.namespace('PaneElements');
    var scrollPosition = fw.observable().receiveFrom('ViewPort', 'scrollPosition');
    var maxScrollResetPosition = fw.observable().receiveFrom('ViewPort', 'maxScrollResetPosition');
    var pageLoading = fw.observable().broadcastAs({ name: 'pageLoading', namespace: 'mainRouter' });
    var viewPortLayoutMode = fw.observable().receiveFrom('ViewPort', 'layoutMode');

    function initPage(metaData) {
      $pageNamespace.publish( 'initMeta', metaData );
    }

    function getPageLoadPromise() {
      var pagePromise = $.Deferred();
      pageLoading(true);
      pagePromise.done(function(metaData, article) {
        var maxScrollResetPos = maxScrollResetPosition();
        if( metaData.length ) {
          metaData = JSON.parse(metaData);
          initPage(metaData);
        }

        if( viewPortLayoutMode() !== 'mobile' ) {
          $paneElementsNamespace.publish('hideAll');
        }
        if( scrollPosition() > maxScrollResetPos ) {
          window.scrollTo( 0, maxScrollResetPos );
        }

        if( location.hash.length ) {
          $pageSectionNamespace.publish( 'scrollToSection', location.hash.slice( location.hash.indexOf('#') + 1 ) );
        }
        $(article).find('.collapsible').collapsible();

        pageLoading(false);
      });

      $pageNamespace.publish('loadingPage', pagePromise);
      return pagePromise;
    }

    function resolvePage(pageLoadPromise, element) {
      pageLoadPromise.resolve( $('#metaData').text(), element.children[0] );
    }

    return {
      relativeToParent: false,
      routes: [
        {
          route: '/',
          title: 'footwork.js',
          controller: function($routeParams) {
            this.$outlet('mainContent', 'index-page', _.bind(resolvePage, this, getPageLoadPromise()));
          }
        }, {
          route: '/annotated',
          title: 'footworkjs - Annotated Source',
          controller: function($routeParams) {
            this.$outlet('mainContent', 'annotated-page', _.bind(resolvePage, this, getPageLoadPromise()));
          }
        }
      ],
      unknownRoute: {
        title: '404 not found',
        controller: function($routeParams) {
          this.$outlet('mainContent', 'not-found-page', _.bind(resolvePage, this, getPageLoadPromise()));
        }
      }
    };
  }
);