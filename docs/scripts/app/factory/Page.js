define([ "jquery", "lodash", "knockout-footwork", "history" ],
  function( $, _, ko ) {
    return ko.model({
      namespace: 'Page',
      afterCreating: function() {
        var metaData = window._pageMeta,
            pageSectionNamespace = ko.namespace('PageSection');

        this.url( document.URL );
        if( metaData ) {
          this.loadMeta( metaData );

          if( metaData.sections !== undefined && metaData.sections.length && location.hash.length ) {
            pageSectionNamespace.publish( 'scrollToSection', location.hash.slice( location.hash.indexOf('#') + 1 ) );
          }
        }
      },
      initialize: function() {
        var pageSectionsNamespace = ko.namespace('PageSections'),
            paneElementsNamespace = ko.namespace('PaneElements'),
            $mainContent = $('.js-main');

        this.defaultTitle = ko.observable('staticty.pe');

        this.transitionsEnabled = ko.observable(false).receiveFrom('ViewPort', 'transitionsEnabled');
        this.scrollPosition = ko.observable().receiveFrom('ViewPort', 'scrollPosition');
        this.maxScrollResetPosition = ko.observable().receiveFrom('ViewPort', 'maxScrollResetPosition');
        this.viewPortLayoutMode = ko.observable().receiveFrom('ViewPort', 'layoutMode');
        this.overlapPane = ko.observable().receiveFrom('Body', 'overlapPane');
        this.paneCollapsed = ko.observable().receiveFrom('Pane', 'collapsed');

        this.url = ko.observable().extend({
          write: function( target, url ) {
            var indexOfHash = url.indexOf('#');

            if( indexOfHash !== -1 ) {
              this.baseURL( url.substr( 0, indexOfHash ) );
              this.hashURL( url.substr( indexOfHash + 1 ) );
            } else {
              this.baseURL( url );
              this.hashURL('');
            }

            target( url );
          }.bind( this )
        }).broadcastAs('url');
        this.baseURL = ko.observable().broadcastAs('baseURL');
        this.hashURL = ko.observable().broadcastAs('hashURL', true);
        this.title = ko.observable( this.defaultTitle() ).broadcastAs('title');
        this.shortTitle = ko.observable( this.defaultTitle() ).broadcastAs('shortTitle');
        this.loading = ko.observable().broadcastAs('loading');

        History.Adapter.bind( window, 'statechange', this.loadState = function() {
          var url = History.getState().url;
          this.url( url );

          window._pageMeta = undefined;
          this.loadingPagePromise !== undefined && this.loadingPagePromise.abort();
          this.loadingPagePromise = $.ajax({
            url: url + '?content-only'
          }).done(function(response) {
              var maxScrollResetPos = this.maxScrollResetPosition();

              this.loading(true);
              $mainContent.html(response);
              if( this.viewPortLayoutMode() !== 'mobile' ) {
                paneElementsNamespace.publish('hideAll');
              }
              if( this.scrollPosition() > maxScrollResetPos ) {
                window.scrollTo( 0, maxScrollResetPos );
              }
              this.loadMeta( window._pageMeta );
              setTimeout(function() { this.loading(false); }.bind(this), 20);
            }.bind(this))
            .always(function() {
              this.loading(false);
            }.bind(this))
            .fail(function(xhr) {
              $mainContent.html(xhr.responseText);
            });

          this.namespace.publish('loadingPage', this.loadingPagePromise);
        }.bind(this));

        this.loadMeta = function( metaData ) {
          if( metaData !== undefined ) {
            pageSectionsNamespace.publish( 'load', metaData );
            this.title( metaData.title + ' - ' + this.defaultTitle() );
            this.shortTitle( metaData.title || this.defaultTitle() );
          }
        }.bind(this);

        this.loadURL = function( url, title ) {
          if( History.enabled ) {
            if( History.getState().url.split('').reverse().join('').substring( 0, url.length ) !== url.split('').reverse().join('') ) {
              // user did not click the same page, clear the current PageSections list
              pageSectionsNamespace.publish('clear');
            } else {
              this.loading(true);
              setTimeout(function() { this.loading(false); }.bind(this), 20);
            }

            if( this.overlapPane() === true && this.paneCollapsed() === false ) {
              this.paneCollapsed(true);
            }

            History.pushState( null, (title && (title + ' - ' + this.defaultTitle())) || this.defaultTitle(), url );
          } else {
            window.location = url;
            return false;
          }

          return true;
        }.bind( this );

        this.namespace.subscribe( 'initMeta', function( metaData ) {
          this.loadMeta( metaData );
        }).withContext( this );

        this.namespace.subscribe( 'loadURL', function( param ) {
          this.loadURL( param.url, param.title );
        }).withContext( this );
      }
    });
  }
);