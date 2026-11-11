/* JackAudio content editor: Media Library selectors and live range labels. */
(function () {
	'use strict';

	document.addEventListener('click', function (event) {
		var choose = event.target.closest('.jackaudio-image-choose');
		var reset = event.target.closest('.jackaudio-image-reset');
		if (!choose && !reset) { return; }

		var card = event.target.closest('[data-image-card]');
		if (!card) { return; }
		var id = card.querySelector('.jackaudio-image-id');
		var preview = card.querySelector('.jackaudio-image-preview img');
		var resetButton = card.querySelector('.jackaudio-image-reset');

		if (reset) {
			id.value = '';
			preview.src = card.getAttribute('data-default-url');
			resetButton.hidden = true;
			return;
		}

		var frame = window.wp.media({
			title: 'Choose a photograph',
			button: { text: 'Use this image' },
			library: { type: 'image' },
			multiple: false
		});
		frame.on('select', function () {
			var attachment = frame.state().get('selection').first().toJSON();
			id.value = attachment.id;
			preview.src = attachment.sizes && attachment.sizes.medium_large ? attachment.sizes.medium_large.url : attachment.url;
			resetButton.hidden = false;
		});
		frame.open();
	});

	document.addEventListener('input', function (event) {
		if (!event.target.matches('.jackaudio-range input[type="range"]')) { return; }
		var output = event.target.closest('.jackaudio-range').querySelector('output');
		if (output) { output.textContent = event.target.value + '%'; }
	});
})();
