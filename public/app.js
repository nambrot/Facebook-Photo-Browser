// GLOBALS
// contains our app object
var a;
// contains the name, since I wasnt sure what to name it
var name = 'Facebook Photo Browser';
// will contain the current user id to be able to access it for profile
var userid;
// FB API Key
var fbkey = '120113361392210';
// Load facebook sdk async
(function(d) {
      var js;
      var id = 'facebook-jssdk'; 
      if (d.getElementById(id)) {return;}
      js = d.createElement('script'); js.id = id; js.async = true;
      js.src = "//connect.facebook.net/en_US/all.js";
      d.getElementsByTagName('head')[0].appendChild(js);
} (document));
// Small bootstrapping object to handle splash screen
var bootstrap = {
  loginSuccessful: function () {
    FB.api('/me', function (resp) {
      userid = resp.id;
    });
    $('#message').text("Successfully logged in.").addClass('animated fadeIn');
    a = new A();
    // Start it motherfuckers
    Backbone.history.start({pushState: true})
  },
  notLoggedInYet: function () {
    $('#message').html("Welcome to the " + name +". Please <span id='loginbutton''>login</span> to use. While this application asks for a lot of permissions, I swear it won't be misused. In fact, there are no calls to my server beyond this point, just to Facebook's Graph API. You can find the source code of this application on <a href='https://github.com/nambrot/Facebook-Photo-Browser>Github</a> ").addClass('animated fadeIn');
    $('#loginbutton').click(_.bind(this.login, this));
  },
  login: function () {
    FB.login(function(response){},{scope: 'user_videos, friends_videos, user_photos, friends_photos, read_stream, friends_photos, friends_photo_video_tags,  user_location,user_about_me,friends_about_me,friends_location, friends_website, user_website, user_birthday, friends_birthday, user_education_history, friends_education_history, user_hometown, friends_hometown, user_online_presence, friends_online_presence'});
  }
}
// fb sdk handler
window.fbAsyncInit = function() {
   FB.init({appId: fbkey, status: true, cookie: true, xfbml: true, oauth:true});
   // Subscribe to Login/Logout Events
   FB.Event.subscribe('auth.login', bootstrap.loginSuccessful);
   FB.Event.subscribe('auth.logout', bootstrap.logouSuccessful);
   // Check Login Status for possible existing users
   FB.getLoginStatus(_.bind(function(response) {
         if (response.authResponse) {
             // logged in and connected user, someone you know
             bootstrap.loginSuccessful();
         }
         else {
            bootstrap.notLoggedInYet();
         }
   }, this));
};

// VIEWS

// Photo Views

// Photo View in Collection View
var PhotoThumbView = Backbone.View.extend({
  width: 180,
  className: 'photo item',
  template: _.template('<img src="<%= model.images[3].source %>" alt="" />'),
  events: {
    'click': 'showPhoto'
  },
  // function to show the photo selected
  showPhoto: function () {
    // remove the selected class from other elements
    $(this.el).siblings().removeClass('selected');
    // add it
    $(this.el).addClass('selected');
    // add the photo to the viewer
    a.viewer.addModel(this.model, $(a.mainpane.el).scrollTop());
    // add object to history
    a.navigate('photo/'+this.model.get('id'), false);
    // save our current state for the history
    a.viewer.saveState();
  },
  initialize:function () {  
    this.render();
  },
  render: function () {
    // calculate the dimenstions to work with floating elements
    $(this.el).css({
      width: this.width,
      height: this.model.get('height') / this.model.get('width') * this.width
    })
    // do async loading, only show image when it is done loading
    var image = new Image();
    image.onload = _.bind(function () {
      // append the image, set its opacity and animate it in
      $(this.el).append(image);
      $(this.el).css({opacity: 1});
      $(this.el).addClass('animated bounceIn');
    },this);
    // set the source to initiate loading, always take the second image (usually between 720 and 180)
    image.src = this.model.attributes.images[1].source;
  }
});
// Photo View for Viewer
var PhotoDetailView = Backbone.View.extend({
  template: _.template('<div class="comment"> <div class="commentblock"> <div class="commentatorphoto"> <a class="commentatorname inboundlink" href="/profile/<%= model.from.id %>"><img src="http://graph.facebook.com/<%= model.from.id %>/picture" alt="" /></a> </div> <div class="commentbody"> <a class="commentatorname inboundlink" href="/profile/<%= model.from.id %>"> <%= model.from.name %> </a> <% if (model.name) { %> <div class="commenttext"> <%= model.name %> </div> <% } %> <% if (model.to){ %> <div class="tagged"> with - <% for(var i = 0; i< model.to.data.length; i++){ %> <%= i == 0 ? "" : ", " %> <a class="commentatorname inboundlink" href="/profile/<%= model.to.data[i].id %>"> <%= model.to.data[i].name %> </a> <% } %> </div> <% } %> </div> </div> <% if (model.likes) { %> <div class="commentlikes"> <span class="commentlikenumber"> <%= model.likes.data.length %> </span> <%= pluralize(model.likes.data.length, "Like") %> </div> <% } %> </div> <div id="photo"> <img src="<%= model.source %>" alt="" /> </div> <% if (model.tags) { %> <div class="tags"> Tagged: <% for(var i = 0; i< model.tags.data.length; i++){ %> <%= i == 0 ? "" : ", " %> <a class="commentatorname inboundlink" href="/profile/<%= model.tags.data[i].id %>"> <%= model.tags.data[i].name %> </a> <% } %> </div> <% } %> <% if (model.comments){ %> <div class="label"> Comments: </div> <% for(var i = 0; i<model.comments.data.length; i++) { %> <div class="comment"> <div class="commentblock"> <div class="commentatorphoto"> <a class="commentatorname inboundlink" href="/profile/<%= model.comments.data[i].from.id %>"><img src="http://graph.facebook.com/<%= model.comments.data[i].from.id %>/picture" alt="" /></a> </div> <div class="commentbody"> <a class="commentatorname inboundlink" href="/profile/<%= model.comments.data[i].from.id %>"> <%= model.comments.data[i].from.name %> </a> <% if (model.comments.data[i].message) { %> <div class="commenttext"> <%= model.comments.data[i].message %> </div> <% } %> </div> </div> <% if (model.comments.data[i].likes) { %> <div class="commentlikes"> <span class="commentlikenumber"> <%= model.comments.data[i].likes %> </span> <%= pluralize(model.comments.data[i].likes, "Like") %> </div> <% } %> </div> <% } %> <% } %>'),
  events: {
    'gesturechange #photo': 'gesture'
  },
  // should supposed to detect zoom gesture and make it fullscreen
  gesture: function (evt) {
    if (evt.scale > 1.5)
      a.addModel(this.model);
  },
  className: 'photo viewer',
  initialize: function () {
    this.render();
  },
  render: function () {
    // attaches pluralize function for the like count
    $(this.el).append(this.template({model: this.model.toJSON(), pluralize: function(num, str){
      if (num > 1)
        return str + 's';
      return str;
    }}));
    // set the maximum height of the photo so that it fits comfortably to the screen
    $(this.el).find('#photo img').css({'max-height': 0.70 * $(window).height()})
    return this;
  }
});
// photo View for Fullscreen
var PhotoFullScreenView = Backbone.View.extend({
  className: 'photo fullscreen',
  template: _.template('<div id="photo"><div style="background: url(<%= model.source %>) center center no-repeat"></div></div>'),
  initialize: function () {
    this.render();
  },
  render: function () {
    $(this.el).append(this.template({model: this.model.toJSON(), pluralize: function(num, str){
      if (num > 1)
        return str + 's';
      return str;
    }}));
  }
})

// View to show a collection of items. currently thats only photos, but it is written to be extended to other types such as videos, statusses, links etc.
var CollectionView = Backbone.View.extend({
  tagName: 'div',
  className: 'collection',

  initialize: function () {
    // set up infinite scroll
    this.checkScroll();
    // bind handler to know whether it has been attached to the DOM (to set up masonry)
    this.bind('appended', this.didAppend, this);
    
    // bind handlers related to the collection
    this.model.bind('add', this.addItem, this);
    this.model.bind('load:start', this.modelStartedLoading, this);
    this.model.bind('load:end', this.modelEndedLoading, this);
    this.model.bind('load:finished', this.modelIsDone, this);
    
    // add items individually
    _.each(this.model.models, this.addItem, this);
  },
  // add item to the collection
  addItem: function (item) {
    // receive the appropriate view from the map in the application object
    var view = new a.modelmap[item.get('type')].thumbView({model: item});
    // append it to the view
    $(this.el).append(view.el);
    // update masonry
    this.update();
  },
  // check continously whether we need to load more items
  checkScroll: function () {
    if (!this.loading)
    {
      // do we have more than two window heights full of items (and if it is attached to the DOM at all)
      if(this.el.parentNode !== null && $(a.mainpane.el).scrollTop() + 2* $(window).height() >= $(this.el).height())
      {
        this.model.fetch({add: true});
      }
    }
    this.timer = setTimeout(_.bind(this.checkScroll, this), 500);
  },
  // model is done with loading
  modelIsDone: function () {
    // clear timeout so that we dont check the collection
    clearTimeout(this.timer);
    // if there were no items, we probably dont have any access to any data
    if(this.model.models.length == 0)
    {
      $(this.el).append('<div class="item">'+this.model.type+' has no data</div>');
      this.update();
    }
  },
  // model functions to ensure correct loading
  modelStartedLoading: function () {
    this.loading = true;
  },
  modelEndedLoading: function () {
    this.loading = false;
  },
  // update the masonry if it is there
  update: function (item) {
    if($(this.el).hasClass('masonry'))
      $(this.el).masonry('reload');
  },
  // did attach to the DOM
  didAppend: function () {
      $(this.el).masonry({itemSelector: '.item', isRTL: true});
    }
});

// Album Views

// Single Album View 
var AlbumView = Backbone.View.extend({
  className: 'albumview',
  // common view functions
  initialize: function () {
    this.bind('appended', this.didAppend, this);
    this.render();
  },
  // foward the DOM insertion
  didAppend: function () {
    this.collectionview.trigger('appended');
  },
  // forward the loading messages
  collectionFinishedLoading: function (model) {
    this.trigger('load:finished', model);
  },
  collectionStartLoading: function (model) {
    this.trigger('load:start', model);
  },
  collectionEndedLoading: function (model) {
    this.trigger('load:end', model);
  },
  render: function () {
    // Album View consists of the ThumbView and the CollectionView
    this.thumbview = new AlbumThumbView({model: this.model});
    this.thumbview.bind('load:start', this.collectionStartLoading, this);
    this.thumbview.bind('load:end', this.collectionEndedLoading, this);
    this.thumbview.bind('load:finished', this.collectionFinishedLoading, this);
    // get the photos of the album
    var photos = this.model.getAlbumPhotos();
    // create the view and append it
    this.collectionview = new CollectionView({model: photos});     
    $(this.el).append(this.thumbview.el);
    $(this.el).append(this.collectionview.el);
    $(this.thumbview.el).addClass('animated bounceInRight');
  }
})
// A thumbnal view for an album (simple)
var AlbumThumbView = Backbone.View.extend({
  className: 'albumthumbview',
  template: _.template('<div class="albumbody"> <a href="/album/<%= model.id %>" class="inboundlink"><div class="albumname block"><%= model.name %></div></a> <% if (model.description !== null) { %> <div class="albumdescription"> <%= model.description %></div> <% } %> <div class="albumdate block"> <div class="label">Created</div> <%= new Date(model.created_time).toLocaleDateString() %> </div> <div class="photocount block"> <div class="label">Photos</div> <%= model.count ? model.count : 0 %> </div> <% if (model.location != null) { %> <div class="albumlocation block"> <div class="label"> Location</div> <div class="name"> <%= model.location %></div> </div> <% } %> </div> <div class="albumpicture"> <a href="/album/<%= model.id %>" class="inboundlink"><img src="<%= model.coverphoto %>" alt="" /></a> </div>'),
  initialize: function () {
    this.render();
  },
  render: function () {
    $(this.el).append(this.template( {
      model:this.model.toJSON()
    } ));
  }
});
//  View of a collection of albums, just add an item and extend CollectionView
var AlbumCollectionView = CollectionView.extend({
  className: 'albumcollectionview',
  // add the album to the view
  addItem: function (album) {
    var view = new AlbumThumbView({model: album});
    view.bind('albumclicked', this.showAlbum, this);
    $(this.el).append(view.el);
    $(view.el).addClass('animated bounceInLeft');
  }
})
// View of a profile
var ProfileView = Backbone.View.extend({
  className: 'collection profile',
  template: _.template('<div class="block person"> <div class="image"> <img src="http://graph.facebook.com/<%= model.id %>/picture" alt="" /> </div> <div class="body"> <div class="name"><%= model.name %></div> </div> </div> <% if(model.location){ %> <div class="block location"> <div class="label"> Location </div> <%= model.location.name %> </div> <% } %> <% if(model.hometown){ %> <div class="block location"> <div class="label"> Hometown </div> <%= model.hometown.name %> </div> <% } %> <% if(model.education){ %> <div class="education block"> <div class="label"> Education </div> <% for (var i = 0; i<model.education.length; i++) { %> <div class="educationstation"> <div class="image"> <img src="http://graph.facebook.com/<%= model.education[i].school.id %>/picture" alt="" /> </div> <div class="educationbody"> <div class="institution"> <%= model.education[i].school.name %> <span class="type">(<%= model.education[i].type %>)</span> </div> <div class="details"> Class of <%= model.education[i].year ? model.education[i].year.name : "Unknown" %> <% if (model.education[i].concentration){ %> <% for (var j = 0; j < model.education[i].concentration.length; j++){ %> <span class="concentration"> · <%= model.education[i].concentration[j].name %></span> <% } %> <% } %> </div> </div> </div> <% } %> </div> <% } %> <ul> <a href="/wall/<%= model.id %>" id="wall"> <li>Wall</li> </a> <a href="/tagged/<%= model.id %>" id="tagged"> <li>Tagged Photos</li> </a> <a href="/albums/<%= model.id %>" id="albums"> <li>Albums</li> </a> </ul> <div id="subview"></div>'),
  initialize: function () {
    this.render();
    // bind the insertion to the DOM
    this.bind('appended', this.appended, this);
  },
  appended: function () {
    // trigger the subview for DOM insertion
    if(this.subview)
    this.subview.trigger('appended');
  },
  render: function () {
    $(this.el).append(this.template({model: this.model.toJSON()}));
    // put the default view on
    this.updateView(); 
  },
  // register events for the subviews
  events: {
    'click #wall': 'wall',
    'click #tagged': 'tagged',
    'click #albums': 'albums'
  },
  // subview functions
  albums: function () {
    var albums = this.model.getAlbums();
    albums.fetch({add: true});
    a.navigate('/albums/'+this.model.id, true);
    return false;
  },
  tagged: function () {
    var taggedPhotos = this.model.getTaggedPhotos();
    taggedPhotos.fetch({add: true});
    a.navigate('/tagged/'+this.model.id, true);
    return false;
  },
  wall: function () {
    var wall = this.model.getWall();
    wall.fetch({add: true});
    a.navigate('/wall/'+this.model.id, true);
    return false;
  },
  // change the view based on that the state the profile has
  updateView: function () {
    var model = this.model.getCollection();
    $(this.el).children('ul').children().removeClass('selected');
    $(this.el).children('ul').children('#'+this.model.state).addClass('selected');
    this.subview = new model.view({model: model});
    $(this.el).children('#subview').children().remove();
    $(this.el).children('#subview').append(this.subview.el);
    // somewhat weird bug
    setTimeout(_.bind(function () {
      this.subview.trigger('appended')
    }, this),1)
    return false;
  }
});

// MODELS

// actual model 
var Photo = Backbone.Model.extend({
  type: 'photo',
  // modified sync function to get the right data
  sync: function(method, model, options)
  {
    // fb api batch request to get the album id too
    FB.api('/','POST',{ batch: [{'method': 'GET', 'relative_url': model.id },{'method' : 'GET', 'relative_url': 'method/fql.query?query=select+name+,+aid+,+object_id+from+album+where+aid+in+(+select+aid+from+photo+where+object_id+=+'+model.id+'+)'}]}, options.success)
  },
  // parse the data
  parse: function (resp, xhr) {
    // first part is the actual photo
    var r = JSON.parse(resp[0].body);
    // second part is supposed to be the album, but we better check
    if (JSON.parse(resp[1].body)[0])
      r.aid = JSON.parse(resp[1].body)[0].object_id;
    return r;
  }
});

// collection of tagged photos of an user
var TaggedPhotos = Backbone.Collection.extend({
  model: Photo,
  type: 'Tagged Photos',
  view: CollectionView,
  // modify the original fetch function to ensure we dont call it too much
  fetch: function (options) {
    if(!this.isLoading && !this.isDone)
    {
      this.isLoading = true;
      Backbone.Collection.prototype.fetch.call(this, options);
    }
  },
  // modify sync function to get more items
  sync: function (method, model, options) {
    // trigger start so that it can be displayed somewhere
    this.trigger('load:start', this);
    // eitheir load from scratch or use the paging field
    if (!this.next)
    FB.api('/' + this.id + '/photos', {'limit': '25'},options.success)
    else
    FB.api(this.next.replace(/^(?:\/\/|[^\/]+)*\//, '/'), options.success);
  },
  // modify the parse function to parse the data
  parse: function (resp, xhr) {
    // put the scope of this more globally
    var that = this;
    // if we have paging, save it for the next call
    if (resp.paging && resp.paging.next)
    {
      this.next = resp.paging.next;
    }
    else
    {
      // if we dont the paging field, we are done with this
      this.isDone = true;
      this.trigger('load:finished', this);
    }
    // done loading the collection
    this.isLoading = false;
    this.trigger('load:end', this);
    // add each photo in the response to the collection
    _.each(resp.data, _.bind(function (obj) {
      var photo = new Photo(obj);
      photo.collection = this;
      photo.set({type: 'photo'});
      this.add(photo)
    }, this))
    return [];
  }
})

//  Actual model behind the album
var Album = Backbone.Model.extend({
  type: 'Album',
  view: AlbumView,
  // fetching functions
  sync: function (method, model, options) {
    // batch request to get the cover photo with the album
    FB.api('/', 'POST', { batch: [{'method': 'GET',"name": "photo","omit_response_on_success": false, 'relative_url': model.id}, {'method': 'GET', 'depends_on': 'photo', 'relative_url': '{result=photo:$.cover_photo}'}]}, options.success);
  },
  parse: function (resp, xhr) {
    // parse the batch request and add the coverphoto
    var album = JSON.parse(resp[0].body);
    album.coverphoto = JSON.parse(resp[1].body).source;
    return album;
  },
  // get the photos of the album
  getAlbumPhotos: function () {
    // initiate the fetching of the photos if it hasn't done it already
    if (this.attributes.albumphotos == null)
     {
       var photos = new AlbumPhotos();
       
       // bind the events so that we can forward them
       photos.bind('load:end', this.collectionEndedLoading, this);
       photos.bind('load:finished', this.collectionFinishedLoading, this);
       photos.bind('load:start', this.collectionStartLoading, this);
       
       // set the proper attributes
       photos.id = this.attributes.id;
       this.attributes.albumphotos = photos;
       photos.fetch({add: true});
     }
     return this.attributes.albumphotos;
  },
  // trigger colletion loading events for the photos
  collectionFinishedLoading: function (model) {
    this.trigger('load:finished', model);
  },
  collectionStartLoading: function (model) {
    this.trigger('load:start', model);
  },
  collectionEndedLoading: function (model) {
    this.trigger('load:end', model);
  }
});

// we can just extend the tagged photos since both have the same structure in the graph api
var AlbumPhotos = TaggedPhotos.extend({
  model: Photo,
  type: 'Album Photos',
  view: CollectionView
})

// collection of albums
var AlbumCollection = Backbone.Collection.extend({
  model: Album,
  type: 'Albums',
  view: AlbumCollectionView,
  // get the photos of an album
  getAlbumPhotos: function (model) {
    if (model.albumphotos == null)
    {
      var photos = new AlbumPhotos();
      photos.id = model.id;
      model.albumphotos = photos;
      photos.fetch({add: true});
    }
    return model.albumphotos;
  },
  // check that we dont fetch too often
  fetch: function (options) {
    if(!this.isLoading && !this.isDone)
    {
      this.isLoading = true;
      Backbone.Collection.prototype.fetch.call(this, options);
    }
  },
  // make paged requests
  sync: function (method, model, options) {
    this.trigger('load:start', this);
    if (!this.next)
    FB.api('/' + this.id + '/albums', {'limit': '25'},options.success)
    else
    FB.api(this.next.replace(/^(?:\/\/|[^\/]+)*\//, '/'), options.success);
  },
  parse: function (resp, xhr) {
    // do proper load checking
    var that = this;
    if (resp.paging && resp.paging.next)
    {
      this.next = resp.paging.next;
    }
    else
    {
      this.isDone = true;
      this.trigger('load:finished', this);
    }
    this.isLoading = false;
    
    // we have the album ids but we want more, get actual album objects in batch requests
    FB.api(
      '/',
      'POST',
      {
        batch: _.map(resp.data, function (obj) {
          return {
            'method': 'GET',
            'relative_url': obj.id
          }
        })
      }, 
      function (albumsresponse) {
      // we want to get the coverphotos too, so do another batch request
        var albums = _.map(albumsresponse, function (album) {
          return JSON.parse(album.body);
        });
        FB.api(
          '/', 
          'POST', 
          {
            batch: _.map(albums, function (album) {
              return {
                'method': 'GET',
                'relative_url': album.cover_photo ? album.cover_photo : 'none'
              }
            })
          },
          function (finalresponse) {
            var coverphotos = _.map(finalresponse, function (photo) {
              return JSON.parse(photo.body)
            });
            // zip the responses together
            var xalbums = _.zip(albums, coverphotos);
            _.each(xalbums, function (albumpair) {
                var album = albumpair[0];
                // check whether we actually have a cover photo
                if (albumpair[1])
                  album.coverphoto = albumpair[1].source;
                else
                  album.coverphoto = 'http://placehold.it/350x150';
                that.add(album);
            });
            that.trigger('load:end', that);
          }
        );
      }
    );
    // return nothing for now
    return [];
  }
});
// feed model to get the proper objects
var Feed = Backbone.Collection.extend({
  type: 'Newsfeed',
  view: CollectionView,
  isDone: false,
  isLoading: false, 
  // check fetching process
  fetch: function (options) {
    if(!this.isLoading && !this.isDone)
    {
      this.isLoading = true;
      Backbone.Collection.prototype.fetch.call(this, options);
    }
  },
  // fetch paged responses
  sync: function(method, model, options) {
    this.trigger('load:start', this);
    if (!this.next)
    FB.api('/me/home', {'limit': '100'}, options.success)
    else
    FB.api(this.next.replace(/^(?:\/\/|[^\/]+)*\//, '/'), options.success);
  },
  parse: function(resp, xhr){
    // create scope
    var that = this;
    // proper parsing of the response paging fields
    if (resp.paging && resp.paging.next)
    {
      this.next = resp.paging.next;
    }
    else
    {
      this.isDone = true;
      this.trigger('load:finished', this);
    }
    this.isLoading = false;
    this.trigger('load:end', this);
    // filter the items we support, currently only photos
    var items = _.filter(resp.data, function (obj) {
       return obj.type == 'photo'
     });
    // create the batch array to get the actual items
    FB.api('/','POST', {
      batch: _.map(items, function (obj) {
        return {
          'method': 'GET',
          'relative_url': obj.object_id
        }
      })
    }, function (response) {
      // we got the actual objects
      var models = _.map(response, function (obj) {
        return JSON.parse(obj.body)
      });
      // zip the objects to insert the correct types so that we can get the model from the model map
      var objects = _.zip(models, items);
      _.each(objects, function (obj) {
          obj[0].to = obj[1].to;
          obj[0].type = obj[1].type;
          var model = new a.modelmap[obj[1].type].model(obj[0]);
          that.add(model);
      });
    });
    return [];
  },
  _add : function(model, options) {
    // modify private function to ensure the addition of the reference of the collection to the model
    this._byId[model.id] = model;
    this._byCid[model.cid] = model;
    model.collection = this;
    this.models.push(model);
    this.trigger('add', model, this, options);
    return model;
  },
  constructor: function (models, options) {
    // modify the constructor to extend the collection with the options that we get
    _.extend(this, options);
    Backbone.Collection.prototype.constructor.call(this, models);
  },
  initialize: function () {
    this.id = 'feed';
  }
})
// just extend the feed object since functionality is the same
var Wall = Feed.extend({
  type: 'Wall',
  view: CollectionView,
  // just modify the fetching function to get wall instaed of feed
  sync: function (method, model, options) {
    this.trigger('load:start', this);
    if (!this.next)
    FB.api('/' + this.id + '/feed', {'limit': '50'},options.success)
    else
    FB.api(this.next.replace(/^(?:\/\/|[^\/]+)*\//, '/'), options.success);
  }
});
// profile model
var Profile = Backbone.Model.extend({
  type: 'Profile',
  view: ProfileView,
  wall: null,
  taggedPhotos: null,
  albums: null,
  // will contain the state for the view
  state: null,
  initialize: function () {
    this.setState(this.attributes.defaultstate);
  },
  // just fetch the object
  sync: function (method, model, options) {
    this.trigger('load:start',this);
    FB.api(model.id, options.success);
  },
  // modify for messaging purposes
  parse: function (resp, xhr) {
    this.trigger('load:end', this);
    return resp;
  },
  // forward the events
  collectionFinishedLoading: function (model) {
    this.trigger('load:finished', model);
  },
  collectionStartLoading: function (model) {
    this.trigger('load:start', model);
  },
  collectionEndedLoading: function (model) {
    this.trigger('load:end', model);
  },
  
  // get the different states
  getTaggedPhotos : function () {
    if (!this.taggedPhotos){
      this.taggedPhotos = new TaggedPhotos();
      this.taggedPhotos.id = this.id;
      this.taggedPhotos.bind('load:finished', this.collectionFinishedLoading, this);
      this.taggedPhotos.bind('load:start', this.collectionStartLoading, this);
      this.taggedPhotos.bind('load:end', this.collectionEndedLoading, this);
    }
    this.state = 'tagged';
    return this.taggedPhotos;
  },
  getWall: function () {
    if (!this.wall){
      this.wall = new Wall();
      this.wall.id = this.id;
      this.wall.bind('load:finished', this.collectionFinishedLoading, this);
      this.wall.bind('load:start', this.collectionStartLoading, this);
      this.wall.bind('load:end', this.collectionEndedLoading, this);
    }
    this.state = 'wall';
    return this.wall;
  },
  getAlbums: function() {
    if (!this.albums){
      this.albums = new AlbumCollection();
      this.albums.id = this.id;
      this.albums.bind('load:finished', this.collectionFinishedLoading, this);
      this.albums.bind('load:start', this.collectionStartLoading, this);
      this.albums.bind('load:end', this.collectionEndedLoading, this);
    }
    this.state = 'albums';
    return this.albums;
  },
  
  // get whatever is the current state
  getCollection: function () {
    switch (this.state){
      case 'wall': return this.getWall(); break;
      case 'albums': return this.getAlbums(); break;
      case 'tagged': return this.getTaggedPhotos(); break;
      default: return this.getWall();
    }
  },
  
  // state functions for the history
  getState: function () {
    return this.state;
  },
  setState: function (arg) {
    this.state = arg;
  }
  
})

// Router or Controller or App or whatever you wanna call it
var A = Backbone.Router.extend({
  
  // State control object, caches all objects we come across
  historyState: {},
  // fetches the object for the id
  popState: function (id) {
    var state = this.historyState[id];
    // do we have a state?
    if (!state)
    return false; 
     
    // just add the viewmodel
    this.viewer.addModel(state.viewmodel, state.mainpanescroll);
    
    // do we have the same mainpane model
    if (this.mainpane.model !== state.mainpanemodel)
    {
      // main pane is different
      if (state.mainpanestate && this.mainpane.model.getState && this.mainpane.model.getState() !== state.mainpanestate)
      {
        // it is also in a different state
        state.mainpanemodel.setState(state.mainpanestate);
      }
      this.mainpane.addModel(state.mainpanemodel, state.mainpanescroll);
    }
    else
    {
      // main pane model is the same
      if (state.mainpanestate && this.mainpane.model.getState && this.mainpane.model.getState() !== state.mainpanestate)
      {
        // but we have a different state
        this.mainpane.model.setState(state.mainpanestate);
        this.mainpane.subview.updateView();
      }
      //update the scroll
      $(this.mainpane.el).animate({scrollTop: state.mainpanescroll}, 1000);
      
    }
    
    return true;
  },
  // saves the current state of the viewing model by its id
  saveState: function (id, scroll) {
    this.historyState[id] = {
      viewmodel: this.viewer.model,
      mainpanemodel: this.mainpane.model,
      mainpanestate: (this.mainpane.model.getState ? this.mainpane.model.getState() : null),
      mainpanescroll: scroll
    };
  },
  // saves the state of the mainpane model
  saveMainpaneState: function (id, scroll) {
    this.historyState[id] = {
      viewmodel: null,
      mainpanemodel: this.mainpane.model,
      mainpanestate: (this.mainpane.model.getState ? this.mainpane.model.getState() : null),
      mainpanescroll: scroll
    };

  },

  // modelmap to map facebook types to its models and views
  modelmap: {
    'photo': {
      model: Photo,
      thumbView: PhotoThumbView,
      fullView: PhotoDetailView,
      fullScreenView: PhotoFullScreenView
    },
    'Newsfeed': {
      model: Feed
    },
    'Album': {
      model: Album
    }
  },
  initialize: function () {
    // Set up our main views
    this.toolbar = new Toolbar();
    $('body').append(this.toolbar.el);

    this.mainpane = new MainPane();
    $('#container').append(this.mainpane.el);
      
    this.viewer = new ViewPane();
    $('#container').append(this.viewer.el);
    
    // make mainpane encompass everything
    this.setRatio(1.0);
    
    // bind click events of links that we can handle
    $('#container').on('click', '.inboundlink', _.bind(this.nav, this));
    
    // bind loading events for the use
    this.bind('load:start', this.loadStart, this);
    this.bind('load:end', this.loadEnd, this);
    this.bind('load:finished', this.loadFinished, this);
    
    // done with everything, remove the splashscreen
    $('#splashscreen').addClass('animated bounceOutUp');
    setTimeout(function () {
      $('#splashscreen').remove();
    },1000);
  },
  // set the view ratio vetween the mainpane and the viewer
  setRatio: function (ratio) {
    // only allow ratios of greater than 0.4
    if (ratio > 0.4){
      // set the ratios
      $(this.mainpane.el).css({width: ratio*98+'%'});
      $(this.viewer.el).css({width: (1-ratio)*98 + '%'});
      
      // do some more work if we have a view in the mainpane to trigger masonry updates
      if(this.mainpane.subview)
      {
        var count = 10;
        var timer;
        var f = _.bind(function () {
          if(count > 0)
          {
            this.mainpane.subview.trigger('appended');
            count--;
          }
          timer = setTimeout(_.bind(f,this), 100);
        },this);
        f();
      }
        
    }

  },
  // functions to handle the messaging of collections
  // contains all models currently loading
  loadingModels: [],
  loadFinished: function (model) {
    // the collection has no more data to load
    $('#info').text( model.type + ' has no more data.');
    // if we have models in the queue, display them
    if(this.loadingModels.length > 0)
    {
      model = this.loadingModels[0];
      $('#info').text('Loading ' + model.type + ' ... ');
      var opts = {
        lines: 10, // The number of lines to draw
        length: 4, // The length of each line
        width: 2, // The line thickness
        radius: 4, // The radius of the inner circle
        color: '#252525', // #rgb or #rrggbb
        speed: 1, // Rounds per second
        trail: 20, // Afterglow percentage
        shadow: false // Whether to render a shadow
      };
      var spinel = $('<div id="spinner"></div>');
      $('#info').prepend(spinel);
      var spinner = new Spinner(opts).spin(spinel[0]);
    }
  },
  // a collection is starting to load
  loadStart: function (model) {
    // clear any previous timeouts
    window.clearTimeout(this.infoTimeout);
    // add our model to the queue
    this.loadingModels.push(model);
    // adjust the views
    $('#info').text('Loading ' + model.type + ' ... ');
    var opts = {
      lines: 10, // The number of lines to draw
      length: 4, // The length of each line
      width: 2, // The line thickness
      radius: 4, // The radius of the inner circle
      color: '#252525', // #rgb or #rrggbb
      speed: 1, // Rounds per second
      trail: 20, // Afterglow percentage
      shadow: false // Whether to render a shadow
    };
    var spinel = $('<div id="spinner"></div>');
    $('#info').prepend(spinel);
    var spinner = new Spinner(opts).spin(spinel[0]);
  },
  // a collection finished loading a step
  loadEnd: function (model) {
    // remove the model from the queue
    var idx = _.indexOf(this.loadingModels, model);
    this.loadingModels.splice(idx, 1);
    // display it
    $('#info').text('Loading ' + model.type + ' done.');
    // check whether we have more models to go
    if(this.loadingModels.length == 0)
    {
      this.infoTimeout = setTimeout(_.bind(this.clearInfo, this), 1000);
    }
    else
    {
      model = this.loadingModels[0];
      $('#info').text('Loading ' + model.type + ' ... ');
      var opts = {
        lines: 10, // The number of lines to draw
        length: 4, // The length of each line
        width: 2, // The line thickness
        radius: 4, // The radius of the inner circle
        color: '#252525', // #rgb or #rrggbb
        speed: 1, // Rounds per second
        trail: 20, // Afterglow percentage
        shadow: false // Whether to render a shadow
      };
      var spinel = $('<div id="spinner"></div>');
      $('#info').prepend(spinel);
      var spinner = new Spinner(opts).spin(spinel[0]);
    }
  },
  // clear "is done" message
  clearInfo: function () {
    clearTimeout(this.infoTimeout);
    this.infoTimeout = null;
    $('#info').text(name);
  },
  
  // functions related to routes
  routes: {
    '': 'newsfeed',
    'newsfeed': 'newsfeed',
    'photo/:id': 'photo',
    'profile/:id': 'profile',
    '/profile/:id': 'profile',
    '/album/:id': 'album',
    'album/:id': 'album',
    '/albums/:id': 'albums',
    'albums/:id': 'albums',
    '/tagged/:id': 'tagged',
    'tagged/:id': 'tagged',
    '/wall/:id': 'wall',
    'wall/:id': 'wall'
  },
  // just navigate to whatever the user clicked on
  nav: function (evt) {
    this.navigate(evt.currentTarget.pathname, true);
    return false;
  },
  album: function (id) {
    // save whatever the mainpane has right now
    a.mainpane.saveState();
    // see whether we have it in our history object
    if (!this.popState(id))
    {
      // fetch it new
      var album = new Album({id: id});
      album.bind('load:finished', this.loadFinished, this);
      album.bind('load:start', this.loadStart, this);
      album.bind('load:end', this.loadEnd, this);
      album.bind('change', function (arg) {
        a.mainpane.addModel(album, 0);
        a.viewer.addModel(null);
      })
      album.fetch();
    }
    // if we are currently in fullscreen mode, exit out
    if (this.fullscreenviewer)
      this.fullscreenviewer.close();
  },
  profile: function (id, type) {
    // save mainpane state
    a.mainpane.saveState();
    // check history
    if (!this.popState(id))
    {
      // fetch it new
      var profile = new Profile({id: id, defaultstate: type});
      profile.bind('load:finished', this.loadFinished, this);
      profile.bind('load:start', this.loadStart, this);
      profile.bind('load:end', this.loadEnd, this);
      profile.bind('change', function (arg) {
        a.mainpane.addModel(profile, 0);
        a.viewer.addModel(null);
      })
      profile.fetch();
    }
    else
    {
      // we have the model, so just set the state
      this.mainpane.model.setState(type);
      this.mainpane.subview.updateView();
    }
    // if in fullscreen exit
    if (a.fullscreenviewer)
      a.fullscreenviewer.close();
  },
  albums: function (id) {
    this.profile(id,'albums');
  },
  tagged: function (id) {
    this.profile(id, 'tagged');
  },
  wall: function (id) {
    this.profile(id, 'wall');
  },
  newsfeed: function () {
    // save current mainpanemodel
    a.mainpane.saveState();
    // we never fetch the newsfeed to get the latest stuff
    var feed = new Feed();
    feed.bind('load:finished', this.loadFinished, this);
    feed.bind('load:start', this.loadStart, this);
    feed.bind('load:end', this.loadEnd, this);
    feed.fetch();
    a.mainpane.addModel(feed, 0);
    a.viewer.addModel(null);
  },
  photo: function (id) {
    // check history
    if(!this.popState(id))
    {
      // if we dont have it in the history, its the first entrypoint, so do it fullscreen
      var photo = new Photo({id: id});
      photo.bind('change', _.bind(function (argument) {
        this.addModel(photo);
      }, this))
      photo.fetch()
    }
  },
  
  // add a model to fullscreen
  addModel: function (model) {
    // do we already have a fullscreen?
    if (!this.fullscreenviewer)
    {
      this.fullscreenviewer = new FullScreenPane();
      // bind the removal
      this.fullscreenviewer.bind('remove', _.bind(function () {
        this.fullscreenviewer = null;
        // if we dont have a mainpane model, just go to home
        if (!this.mainpane.model)
          this.navigate('', {trigger: true});
      },this))
      $('body').append(this.fullscreenviewer.el);
      $(this.fullscreenviewer.el).addClass('fastanimated bounceIn');
    }
    this.fullscreenviewer.addModel(model);
  }
});

// Toolbar
var Toolbar = Backbone.View.extend({
  template: _.template('<div id="info">Facebook Browser</div><ul><li id="newsfeed">Newsfeed</li><li id="profile">Profile</li></ul>'),
  id: "toolbar",
  events: {
    'click #newsfeed': 'newsfeed',
    'click #profile': 'profile'
  },
  newsfeed: function () {
    a.navigate('newsfeed', true);
  },
  profile: function() {
    a.navigate('profile/'+ userid, {trigger: true})
  },
  initialize: function () {
    this.render();
  },
  render: function () {
    $(this.el).append(this.template({}));
    return this;
  }
});
// Mainpane on the left
var MainPane = Backbone.View.extend({
  id: 'mainpane',
  className: 'transition',
  initialize: function () {
    this.render();
  },
  render: function () {
    this.contentview = $('<div id="contentview" class="twelve column"></div>');
    $(this.el).append(this.contentview);
    return this;
  },
  addModel: function (model, scroll) {
    // remove the old model
    var old = $(this.contentview).children();
    old.addClass('animated bounceOutLeft');
    window.setTimeout(function () {
      old.removeClass('animated bounceOutLeft');
      old.remove();
    }, 1000);
    // attach the new model
    this.model = model;
    // create the view
    this.subview = new model.view({model:model});
    $(this.contentview).append(this.subview.el);
    $(this.subview.el).addClass('animated bounceInLeft');
    $(this.el).animate({scrollTop: scroll}, 1000);
    this.subview.trigger('appended');
    // close the fullscreen if its open
    if (a.fullscreenviewer)
    a.fullscreenviewer.close();
  },
  // save the state of it if we have a model 
  saveState: function (scroll) {
    if (this.model)
      a.saveMainpaneState(this.model.id, scroll ? scroll : $(this.el).scrollTop());
  }
})
// Viewing pane on the 
var ViewPane = Backbone.View.extend({
  template: _.template(''),
  id: 'viewer',
  className: 'transition',
  addModel: function (model, scroll) {
    if (model != null)
    {
      // we want to set a new model, check whether we already have one or not
      if (this.model == null)
      {
        // split the views
        a.setRatio(0.5);
        // set the maximiztion and close tools
        this.tools = $('<div class="tools"><div id="close"><img src="/close.png" alt="" /></div><div id="max"><img src="/max.png" alt="" /></div></div>');
        $(this.el).append(this.tools);
      }
      else
      {
        // we do have a model set, so just remove it
        $(this.view.el).remove()
      }
      // add the model to the view
      this.model = model;
      this.view = new a.modelmap[model.type].fullView({model: model});
      $(this.el).append(this.view.el);
      $(this.view.el).addClass('fastanimated bounceIn');
      // if we are in full screen, add it to there too
      if (a.fullscreenviewer)
        a.fullscreenviewer.addModel(model);
    }
    else
    {
      // we want to reset it in case we have something in the viewer
      if (this.model != null)
        this.close();
    }
  },
  // save the viewer model
  saveState: function (scroll) {
    if (this.model)
      a.saveState(this.model.id, scroll ? scroll : $(a.mainpane.el).scrollTop());
  },
  events: {
    'click #max': 'maximize',
    'click #close': 'close'
  },
  maximize: function () {
    // make it fullscreen
    a.addModel(this.model);
  },
  close: function () {
    // reset the viewer and remove everything
    this.model = null;
    $(this.view.el).remove();
    $(this.tools).remove();
    this.view = null;
    a.setRatio(1.0);
  }
});

// Full Screen Viewer
var FullScreenPane = Backbone.View.extend({
  id: 'FullScreenView',
  initialize: function () {
    // bind key events
    $(document).on('keydown', _.bind(this.keydown, this));
    this.render();
  },
  render: function () {
    $(this.el).append('<div id="tools"><div id="close"><img src="/stop.png" alt="" /></div></div>');
    return this;
  },
  keydown: function (evt) {
    // bind escape and arrow keys
    if (evt.keyCode == 27)
      this.close();
    if (evt.keyCode == 39)
      this.next();
    if (evt.keyCode == 37)
      this.previous();
  },
  events: {
    'click #close': 'close',
    'click #left': 'previous',
    'click #right': 'next',
    'click a': 'navigate',
    'gesturechange': 'gesture'
  },
  // should bind the pinch gesture
  gesture: function (evt) {
    if (evt.scale < 0.7)
      this.close();
  },
  // get the previous photo of the current one
  previous: function () {
    var index = _.indexOf(this.view.model.collection.models, this.view.model) - 1;
    // check bounds
    if (index >= 0)
    {
      var model = this.view.model.collection.models[index];
      a.viewer.addModel(model)
      a.navigate(model.type + '/' + model.id, false);
      a.viewer.saveState();
    }
  },
  // get the next photo of the current one
  next: function () {
    var index = _.indexOf(this.view.model.collection.models, this.view.model) + 1;
    if (index < this.view.model.collection.models.length)
    {
      var model = this.view.model.collection.models[index];
      a.viewer.addModel(model);
      a.navigate(model.type + '/' + model.id, false);
      a.viewer.saveState();
    }
    // fetch more items
    if (index > this.view.model.collection.models.length - 30)
      this.view.model.collection.fetch({add: true});
    
  },
  // navigate to the links
  navigate: function (evt) {
    a.navigate(event.target.pathname, true);
    this.close();
    return false;
  },
  // close the fullscreen viewer
  close: function (evt) {
    // remove event handlers
    $(document).off('keydown');
    // animation
    $(this.el).addClass('fastanimated bounceOut');
    setTimeout(_.bind(function () {
      $(this.el).remove()
    },this), 500);
    // trigger the removal for the app
    this.trigger('remove');
    return false;
  },
  // add navigation if proper
  showNav: function () {
    if (!this.nav)
    {
      this.nav = $('<div id="navigation"><div id="left"><img src="/left.png" alt="" /></div><div id="right"><img src="/right.png" alt="" /></div></div>')
      $(this.el).append(this.nav);
    }
  },
  // hide the navigation
  hideNav: function () {
    $(document).off('keydown');
    $(this.nav).remove();
    this.nav = null;
  },
  addModel: function (model) {
    // remove the old one
    if (this.view)
      $(this.view.el).remove();
    this.view = new a.modelmap[model.type].fullScreenView({model: model});
    $(this.el).append(this.view.el);
    // show navigation on whether the object has a collection
    if (this.view.model.collection)
    this.showNav();
    else
    this.hideNav();    
  }
});

// utils
//fgnass.github.com/spin.js#v1.2.2
(function(a,b,c){function n(a){var b={x:a.offsetLeft,y:a.offsetTop};while(a=a.offsetParent)b.x+=a.offsetLeft,b.y+=a.offsetTop;return b}function m(a){for(var b=1;b<arguments.length;b++){var d=arguments[b];for(var e in d)a[e]===c&&(a[e]=d[e])}return a}function l(a,b){for(var c in b)a.style[k(a,c)||c]=b[c];return a}function k(a,b){var e=a.style,f,g;if(e[b]!==c)return b;b=b.charAt(0).toUpperCase()+b.slice(1);for(g=0;g<d.length;g++){f=d[g]+b;if(e[f]!==c)return f}}function j(a,b,c,d){var g=["opacity",b,~~(a*100),c,d].join("-"),h=.01+c/d*100,j=Math.max(1-(1-a)/b*(100-h),a),k=f.substring(0,f.indexOf("Animation")).toLowerCase(),l=k&&"-"+k+"-"||"";e[g]||(i.insertRule("@"+l+"keyframes "+g+"{"+"0%{opacity:"+j+"}"+h+"%{opacity:"+a+"}"+(h+.01)+"%{opacity:1}"+(h+b)%100+"%{opacity:"+a+"}"+"100%{opacity:"+j+"}"+"}",0),e[g]=1);return g}function h(a,b,c){c&&!c.parentNode&&h(a,c),a.insertBefore(b,c||null);return a}function g(a,c){var d=b.createElement(a||"div"),e;for(e in c)d[e]=c[e];return d}var d=["webkit","Moz","ms","O"],e={},f,i=function(){var a=g("style");h(b.getElementsByTagName("head")[0],a);return a.sheet||a.styleSheet}(),o=function r(a){if(!this.spin)return new r(a);this.opts=m(a||{},r.defaults,p)},p=o.defaults={lines:12,length:7,width:5,radius:10,color:"#000",speed:1,trail:100,opacity:.25,fps:20},q=o.prototype={spin:function(a){this.stop();var b=this,c=b.el=l(g(),{position:"relative"}),d,e;a&&(e=n(h(a,c,a.firstChild)),d=n(c),l(c,{left:(a.offsetWidth>>1)-d.x+e.x+"px",top:(a.offsetHeight>>1)-d.y+e.y+"px"})),c.setAttribute("aria-role","progressbar"),b.lines(c,b.opts);if(!f){var i=b.opts,j=0,k=i.fps,m=k/i.speed,o=(1-i.opacity)/(m*i.trail/100),p=m/i.lines;(function q(){j++;for(var a=i.lines;a;a--){var d=Math.max(1-(j+a*p)%m*o,i.opacity);b.opacity(c,i.lines-a,d,i)}b.timeout=b.el&&setTimeout(q,~~(1e3/k))})()}return b},stop:function(){var a=this.el;a&&(clearTimeout(this.timeout),a.parentNode&&a.parentNode.removeChild(a),this.el=c);return this}};q.lines=function(a,b){function e(a,d){return l(g(),{position:"absolute",width:b.length+b.width+"px",height:b.width+"px",background:a,boxShadow:d,transformOrigin:"left",transform:"rotate("+~~(360/b.lines*c)+"deg) translate("+b.radius+"px"+",0)",borderRadius:(b.width>>1)+"px"})}var c=0,d;for(;c<b.lines;c++)d=l(g(),{position:"absolute",top:1+~(b.width/2)+"px",transform:"translate3d(0,0,0)",opacity:b.opacity,animation:f&&j(b.opacity,b.trail,c,b.lines)+" "+1/b.speed+"s linear infinite"}),b.shadow&&h(d,l(e("#000","0 0 4px #000"),{top:"2px"})),h(a,h(d,e(b.color,"0 0 1px rgba(0,0,0,.1)")));return a},q.opacity=function(a,b,c){b<a.childNodes.length&&(a.childNodes[b].style.opacity=c)},function(){var a=l(g("group"),{behavior:"url(#default#VML)"}),b;if(!k(a,"transform")&&a.adj){for(b=4;b--;)i.addRule(["group","roundrect","fill","stroke"][b],"behavior:url(#default#VML)");q.lines=function(a,b){function k(a,d,i){h(f,h(l(e(),{rotation:360/b.lines*a+"deg",left:~~d}),h(l(g("roundrect",{arcsize:1}),{width:c,height:b.width,left:b.radius,top:-b.width>>1,filter:i}),g("fill",{color:b.color,opacity:b.opacity}),g("stroke",{opacity:0}))))}function e(){return l(g("group",{coordsize:d+" "+d,coordorigin:-c+" "+ -c}),{width:d,height:d})}var c=b.length+b.width,d=2*c,f=e(),i=~(b.length+b.radius+b.width)+"px",j;if(b.shadow)for(j=1;j<=b.lines;j++)k(j,-2,"progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)");for(j=1;j<=b.lines;j++)k(j);return h(l(a,{margin:i+" 0 0 "+i,zoom:1}),f)},q.opacity=function(a,b,c,d){var e=a.firstChild;d=d.shadow&&d.lines||0,e&&b+d<e.childNodes.length&&(e=e.childNodes[b+d],e=e&&e.firstChild,e=e&&e.firstChild,e&&(e.opacity=c))}}else f=k(a,"animation")}(),a.Spinner=o})(window,document);



