function makeAjaxCall(url, type, title, data) {
	var options = {
		method: type,
		success: function(response) {
			$('#requester').html(title);
			try{
				console.log(JSON.stringify(response));
			} catch(error) {
				console.log(response);
			}
		},
		error:function(request, status, error) {
			alert('Erro: ' + error + '. Status: ' + status);
		}
	};

	if(data) {
		options.dataType = 'json';
		options.data = data;
	}
	$.ajax(url, options);
};

function makeFormCall(form, event, type, title, url){
	event.preventDefault();

	var data = form.serialize();

	if(!url){
		url = form.attr("action");
	}

	makeAjaxCall(url, type, title, data);
}


$('#login').submit(function(event){
	event.preventDefault();

	var options = {
		method: 'POST',
		dataType: 'json',
		data: $(this).serialize(),
		success: function(token) {
			$('#requester').html('Log In');
			$('.requestResult').html(token);
			$.cookie('socialAPI', token);
			window.location.href = 'http://localhost:3000/';

		},
		error:function(request, status, error) {
			alert('An error has occured ' + error + '. Status: ' + status);
		}
	};

	$.ajax($(this).attr('action'), options);
});

$('#createUser').submit(function(event) {
	makeFormCall($(this), event, 'POST', 'Create User');
});