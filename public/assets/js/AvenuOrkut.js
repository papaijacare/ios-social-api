//=====================================[ MODELS ]=====================================

var UserModel = Backbone.Model.extend({
  url: '/users/me',
  idAttribute: '_id',
  defaults: {
    "name": "Default Name",
    "email": "default@email.com"
  },
  validate: function(data) {
    var emailRegex = /^[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}$/,
        errors = [];

    if(data.name.length === 0) {
      errors.push('Invalid username.');
    } else if(data.name.length > 50) {
      errors.push('O nome deve conter no máximo 50 caracteres.');
    }

    if(!emailRegex.test(data.email)) {
      errors.push('Invalid email');
    }

    return errors.length ? errors : null;
  },
  parse: function (response) {
    var name = response.name || this.defaults.name,
        tokens = name.split(' ');

    response.firstname = tokens[0];
    response.lastname = tokens.length > 1 ? tokens[tokens.length - 1] : '';

    return response;
  }
});

var FriendshipModel = Backbone.Model.extend({
  urlRoot: '/friendships',
  sync: function(method, model, options) {
    options || (options = {});
    switch(method){
      case 'create':
      options.url = this.urlRoot + '/' + model.attributes.friendID;
      break;
    }
    return Backbone.sync(method, model, options);
  }
});

//==================================[ COLLECTIONS ]===================================

var AvailableUsersList = Backbone.Collection.extend({
  url: '/users/available',
  model: UserModel
});

var FriendsRequestsList = Backbone.Collection.extend({
  url: '/friendships/requests',
  model: FriendshipModel
});

var FriendsRequestedList = Backbone.Collection.extend({
  url: '/friendships/requested',
  model: FriendshipModel
});

var FriendsList = Backbone.Collection.extend({
  url: '/friendships/me',
  model: FriendshipModel
});

//=====================================[ VIEWS ]======================================

var ProfileView = Backbone.View.extend({
  template: _.template($("#profileTemplate").html()),
  initialize: function(){
    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.model, 'error', this.render);
    this.model.fetch();
  },
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    this.loadChildrenViews();

    return this;
  },
  loadChildrenViews: function() {
    var availableUsersView = new AvailableUsersView({
      el: this.$el.find('#allUsers'),
      collection: new AvailableUsersList()
    });

    var friendshipRequestsView = new FriendshipRequestsView({
      el: this.$el.find('#friendRequests'),
      collection: new FriendsRequestsList()
    });

    var friendshipRequestedView = new FriendshipRequestedView({
      el: this.$el.find('#myRequests'),
      collection: new FriendsRequestedList()
    });

    var friendsView = new FriendsView({
      el: this.$el.find('#myFriends'),
      collection: new FriendsList()
    });
  },
  error: function() {
    alert('Ocorreu um error durante à chamada da API');
  }
});

var EditProfileView = Backbone.View.extend({
  events: {
    'submit form': 'save'
  },
  template: _.template($("#editProfileTemplate").html()),
  initialize: function() {
    this.listenTo(this.model, 'sync', this.render);
    this.listenTo(this.model, 'invalid', this.invalid);
    this.model.fetch();
  },
  render: function() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },
  save: function(event) {
    var $form = $(event.currentTarget),
        data = this.getModelData($form);

    this.model.save(data, {
      context: this,
      success: this.success,
      error: this.error
    });

    return false;
  },
  getModelData: function($form) {
    return {
      name: $form.find('#name').val(),
      email: $form.find('#email').val()
    };
  },
  invalid: function(model, errors) {
    alert(errors.join('\n'));
  },
  success: function() {
    this.navigate('/', true);
  },
  error: function() {
    alert('Ocorreu um error ao tentar salvar o perfil');
  }
});

//================================[ COLLECTION VIEWS ]================================

var CollectionView = Backbone.View.extend({
  initialize: function() {
    this.listenTo(this.collection, "sync", this.render);
    this.collection.fetch();
  },
  render: function() {
    var self = this;

    this.$el.html('');
    this.collection.forEach(function(user, index){
      var json = _.extend(user.toJSON(), { index: index });
      self.$el.append( self.template(json));
    });
  },
  getClickedItem: function(event) {
    var $target = $(event.currentTarget),
        $userDiv = $target.closest('.user-div'),
        index = $userDiv.data('index'),
        item = this.collection.at(index);

    return item;
  }
});

var AvailableUsersView = CollectionView.extend({
  events: {
    'click .inviteFriend': 'inviteFriend'
  },
  template: _.template($('#userTemplate').html()),
  inviteFriend: function (event) {
    var user = this.getClickedItem(event),
        friend = new FriendshipModel( { friendID: user.get('_id') });

    friend.save({}, {
      context: this,
      success: this.inviteSuccess,
      error: this.inviteError
    });
  },
  inviteSuccess: function() {
    this.collection.fetch();
    Backbone.trigger('inviteSent');
    alert('Pedido de amizade enviado com sucesso!');
  },
  inviteError: function() {
    alert('Ocorreu um error ao enviar o pedido de amizade');
  }
});

var FriendshipRequestsView = CollectionView.extend({
  events: {
    'click .acceptFriend': 'acceptFriend'
  },
  template: _.template($('#friendRequestTemplate').html()),
  acceptFriend: function(event){
    var user = this.getClickedItem(event),
        friend = new FriendshipModel( { id: user.get('userRequester')._id } );

    friend.save({}, {
      context: this,
      success: this.friendAcceptedSuccess
    });
  },
  friendAcceptedSuccess: function() {
    this.collection.fetch();
    Backbone.trigger('friendAccepted');
    alert('Pedido de amizade aceito com sucesso!');
  },
  friendAcceptedError: function() {
    alert('Ocorreu um erro ao aceitar o pedido de amizade');
  }
});

var FriendshipRequestedView = CollectionView.extend({
  events: {
    'click .cancelRequest': 'cancelRequest'
  },
  template: _.template($('#friendRequestedTemplate').html()),
  initialize: function() {
    // Calling parent view's method ("inheritance")
    CollectionView.prototype.initialize.apply(this, arguments);

    this.listenTo(Backbone, 'inviteSent', this.inviteSent);
  },
  inviteSent: function() {
    this.collection.fetch();
  },
  cancelRequest: function() {
    alert('Cancel Request');
  }
});

var FriendsView = CollectionView.extend({
  template: _.template($('#friendTemplate').html()),
  initialize: function() {
    // Calling parent view's method ("inheritance")
    CollectionView.prototype.initialize.apply(this, arguments);

    this.listenTo(Backbone, 'friendAccepted', this.friendAccepted);
  },
  friendAccepted: function() {
    this.collection.fetch();
  }
});

//=====================================[ ROUTER ]=====================================

var Router = Backbone.Router.extend({
  routes: {
    "": "viewProfile",
    "edit/:userId": "editProfile"
  },
  initialize: function() {
    Backbone.View.prototype.navigate = this.navigate;
    Backbone.history.start();
  },
  viewProfile: function() {
    var userModel = new UserModel(),
        profileView = new ProfileView({ model: userModel });
    
    this.setView(profileView);
  },
  editProfile: function(userId) {
    var userModel = new UserModel({ id: userId }),
        editProfileView = new EditProfileView({ model: userModel });

    this.setView(editProfileView);
  },
  setView: function( view ){
    if( this.currentView ){
      this.currentView.remove();
    }

    this.currentView = view;
    this.currentView.$el.appendTo('#mainViewContainer');
  }
});

// Start the router
var router = new Router();