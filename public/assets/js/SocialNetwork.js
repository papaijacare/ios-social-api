//BEGIN MODELS
var UserModel = Backbone.Model.extend({
	initialize: function(){
		// this.fetch();
	},
	urlRoot: '/users/me',
	parse: function(resp, options){
		var fullName = resp.name.split(' ');
		resp.firstname = fullName[0];
		resp.lastname = fullName[1];
		return resp;
	},
	sync: function(method, model, options) {  
		options || (options = {});
		console.log(method);
		console.log(model);
		switch (method) {
			case 'create':
				options.url = this.urlRoot + '/create';
				break;
			case 'update':
      	// if (model.changedAttributes().password)
    		// options.url = '/users/' + model.get('_id') + '/password';
    		options.url = this.urlRoot;
    		break;

  		case 'delete':
    		break;

  		case 'read':
    		break;
  	}
    return Backbone.sync(method, model, options);
  },
  idAttribute: '_id',
});

var FriendshipModel = Backbone.Model.extend({
	initialize: function(){
		this.on('fetch', this.logFriendship)
	},
  urlRoot: '/friendships',
  sync: function(method, model, options) {
    options || (options = {});
    options.url = this.urlRoot + '/' + model.attributes.friendID;
    console.log(options.url);
    return Backbone.sync(method, model, options);
  },
  logFriendship: function(resp){
  	console.log(resp);
  },

});
//END MODELS

// BEGIN VIEWS
var CollectionView = Backbone.View.extend({
  initialize: function() {
      this.listenTo(this.collection, "update", this.render);
      this.collection.fetch();
  },
  render: function() {
  	var self = this;
    this.$el.html(''); // clean before start
    this.collection.forEach(function(model, index){     
      self.$el.append( self.template(model.attributes));
    });
    this.$el.appendTo(this.el);
  },
  refresh: function(model, resp, options){
  	if(options && options.message)
  		alert(options.message);

  	this.collection.fetch();
  	if(options && options.trigger) 
  		Backbone.trigger(options.trigger);
  },
  doAction: function(event, model, options){
		event.preventDefault();
  	this.listenToOnce(model, 'sync', this.refresh)
		model.save(null,options);

  }
});

var AvaiableUsersView = CollectionView.extend({
	events: {
		'click .inviteFriend': 'inviteFriend'
	},
	template: _.template($('#availableUsersTemplate').html()),
	inviteFriend: function(event){
		var index = $(event.currentTarget).parents('.user-div').index();
		var id = this.collection.at(index).get('_id');
		var friendship = new FriendshipModel({friendID: id});
		this.listenToOnce(friendship, 'sync', this.refresh)
		friendship.save(null,{message: 'Request sent.', trigger: 'inviteSent'});
	}
});

var FriendsRequestsView = CollectionView.extend({
	events: {
		'click .acceptFriend': 'acceptFriend'
	},
	template: _.template($('#friendRequestTemplate').html()),
	acceptFriend: function(event){
		event.preventDefault();
		var index = $(event.currentTarget).parents('.user-div').index();
		var id = this.collection.at(index).get('userRequester')._id;
		var friendship = new FriendshipModel({id: 1, friendID: id});
		this.listenToOnce(friendship, 'sync', this.refresh)
		friendship.save(null,{message: 'Request accepted.', trigger: 'friendAccepted'});
	}
});

var FriendsRequestedView = CollectionView.extend({
	initialize: function(){
		CollectionView.prototype.initialize.apply(this, arguments);
		this.listenTo(Backbone, 'inviteSent', this.refresh);

	},
	template: _.template($('#friendRequestedTemplate').html())
});

var FriendsListView = CollectionView.extend({
	initialize: function(){
		CollectionView.prototype.initialize.apply(this, arguments);
		this.listenTo(Backbone, 'friendAccepted', this.refresh);
	},
	template: _.template($('#friendTemplate').html())
});

var ProfileView = Backbone.View.extend({
	initialize: function(){
		this.model.fetch();
		this.listenTo(this.model, 'sync', this.render);
		// this.loadCollections();
	},
	template: _.template($('#profileTemplate').html()),
	render: function(model,options) {
		this.$el.html(this.template(this.model.attributes));
		this.loadChildrenViews();
		return this;
	},
	loadCollections: function(){
		var users = new AvailableUsersList();
		this.listenTo(users,"update", this.logCollections);
		users.fetch({label: 'Avaiable Users: '});

		var requests = new FriendsRequestsList();
		this.listenTo(requests,"update", this.logCollections);
		requests.fetch({label: 'Friend Requests: '});

		var requested = new FriendsRequestedList();
		this.listenTo(requested,"update", this.logCollections);
		requested.fetch({label: 'Requested Friends: '});

		var friends = new FriendsList();
		this.listenTo(friends,"update", this.logCollections);
		friends.fetch({label: 'Friends List: '});

	},
	logCollections: function(collection,options){
		console.log(options.label, collection.models);
	},
	loadChildrenViews: function(){
		var availableUsersView = new AvaiableUsersView({el: '#availableUsersContainer', collection: new AvailableUsersList()});
		var friendsRequestsView = new FriendsRequestsView({el: '#friendRequestsContainer', collection: new FriendsRequestsList()});
		var friendsRequestedView = new FriendsRequestedView({el: '#myRequestsContainer', collection: new FriendsRequestedList()});
		var friendsListView = new FriendsListView({el: '#myFriendsContainer', collection: new FriendsList()});
	}
});

var EditProfileView = Backbone.View.extend({
	initialize: function(){
		this.model.fetch();
		this.listenTo(this.model, 'sync', this.render);

	},
	template: _.template($('#editProfileTemplate').html()),
	events:{
		'submit form' : 'save'
	},
	save: function(event){
		event.preventDefault();
		var form = $(event.currentTarget);

		this.model.set({
			name: form.find('#name').val(),
			email: form.find('#email').val(),
			password: form.find('#password').val(),
		});
		this.model.save();
		router.navigate('',true);
	},
	render: function(model,options) {
		this.$el.html(this.template(this.model.attributes));
		return this;
	},

});
// END VIEWS

//BEGIN ROUTES
var Router = Backbone.Router.extend({
	routes: {
		"": "viewProfile",
		"edit": "editProfile",
		"*splat": "notFound"
	},
	initialize: function(){
		Backbone.history.start();
	  	// this.listenTo(Backbone.history, "navigate", this.navegar);
	  }, 
	  // navegar: function(a,b,c){
	  // 	console.log(a,b,c);
	  // },
	  viewProfile: function() {
	  	var userModel = new UserModel(),
	  	profileView = new ProfileView({ model: userModel });    
	  	this.setView(profileView);
	  },
	  editProfile: function(userId) {
	  	var userModel = new UserModel(),
	  	editProfileView = new EditProfileView({ model: userModel });
	  	this.setView(editProfileView);
	  },
	  notFound: function() {
	    // ...
	  },
	  setView: function( view ) {
	  	if(this.currentView)
	  		this.currentView.remove();
	  	this.currentView = view;
	  	this.currentView.$el.appendTo('#mainViewContainer');
	  }
	});
//END ROUTES

//BEGIN COLLECTIONS
var AvailableUsersList = Backbone.Collection.extend({
	url: '/users/available',
	model: UserModel,
})

var FriendsRequestsList = Backbone.Collection.extend({
  url: '/friendships/requests'
});

var FriendsRequestedList = Backbone.Collection.extend({
  url: '/friendships/requested'
});

var FriendsList = Backbone.Collection.extend({
  url: '/friendships/me'
});
//END COLLECTIONS

var router = new Router();