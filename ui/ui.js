/**
 * Creates a Ti.UI.View with additional option to use a backgroundImage with
 * backgroundSize:cover like CSS does.
 *
 * @param  {Dictionary} args
 * @return {Ti.UI.View}
 */
exports.createView = function(args) {

	// view using backgroundSize
	if (args.backgroundSize && args.backgroundSize === 'cover' && args.backgroundImage && typeof args.backgroundImage === 'string') {

		// rename as private property
		args._backgroundImage = args.backgroundImage;
		delete args.backgroundImage;

		// target id available to possibly skip postlayout
		if (args.backgroundTarget) {

			// rename as private property
			args._backgroundTarget = args.backgroundTarget;
			delete args.backgroundTarget;

			var targetFile = _getTargetFile(args._backgroundImage, args._backgroundTarget);

			// target exists
			if (targetFile.exists()) {

				// use & return
				args.backgroundImage = targetFile.read();

				return Ti.UI.createView(args);
			}
		}

		var view = Ti.UI.createView(args);

		// no need to wait for postlayout if we know target width & height
		if (args.width && args.height) {
			_setBackgroundImage(view, args.width, args.height);

		} else {
			view.addEventListener('postlayout', _onPostLayout);
		}

		return view;
	}

	// regular view
	else {
		return Ti.UI.createView(args);
	}
};

/**
 * Returns the file that would keep the resized backgroundImage.
 * @param  {String} originalPath
 * @param  {String} targetId
 * @return {Ti.Filesystem.File}
 */
function _getTargetFile(originalPath, targetId) {
	var targetFilename = Ti.Utils.sha1(originalPath + '_' + targetId) + originalPath.substr(originalPath.lastIndexOf('.'));
	var targetFile = Ti.Filesystem.getFile(Ti.Filesystem.applicationCacheDirectory, targetFilename);

	return targetFile;
}

/**
 * Generates or loads a resized backgroundImage, respecting the original aspect
 * ratio while making sure it covers the whole view.
 * @param {Ti.UI.View} view
 * @param {Number} targetWidth
 * @param {Number} targetHeight
 */
function _setBackgroundImage(view, targetWidth, targetHeight) {
	var originalPath = view._backgroundImage;
	var targetId = view._backgroundTarget || targetWidth + '_' + targetHeight;

	var targetFile = _getTargetFile(originalPath, targetId);

	if (!targetFile.exists()) {
		var originalFile = Ti.Filesystem.getFile(originalPath);

		if (!originalFile.exists()) {
			return;
		}

		// orginal specs
		var originalBlob = originalFile.read();
		var originalWidth = originalBlob.width;
		var originalHeight = originalBlob.height;
		var originalRatio = originalWidth / originalHeight;

		// target specs (converted to px)
		targetWidth = Ti.UI.convertUnits('' + targetWidth, Ti.UI.UNIT_PX);
		targetHeight = Ti.UI.convertUnits('' + targetHeight, Ti.UI.UNIT_PX);
		var targetRatio = targetWidth / targetHeight;

		var resizeWidth, resizeHeight;

		// fill width, overflow height
		if (targetRatio > originalRatio) {
			resizeWidth = targetWidth;
			resizeHeight = Math.ceil(resizeWidth / originalRatio);
		}

		// fill height, overflow width
		else {
			resizeHeight = targetHeight;
			resizeWidth = Math.ceil(resizeHeight * originalRatio);
		}

		// resize, if neeeded
		if (originalWidth !== resizeWidth || originalHeight !== resizeHeight) {
			originalBlob = originalBlob.imageAsResized(resizeWidth, resizeHeight);
		}

		// crop, if needed
		if (resizeWidth !== targetWidth || resizeHeight !== targetHeight) {
			originalBlob = originalBlob.imageAsCropped({
				width: targetWidth,
				height: targetHeight
			});
		}

		targetFile.write(originalBlob);

		view.backgroundImage = originalBlob;

	} else {
		view.backgroundImage = targetFile.read();
	}
}

/**
 * Handles the Ti.UI.View.postlayout event, takes the width and height and
 * then sets the backgroundImage.
 * @param  {Ti.Event} e
 */
function _onPostLayout(e) {
	var view = e.source;
	var size = view.size;

	// only once
	view.removeEventListener('postlayout', _onPostLayout);

	// continue now that we know width & height
	_setBackgroundImage(view, size.width, size.height);
}