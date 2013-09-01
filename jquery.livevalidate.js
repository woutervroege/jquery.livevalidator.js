/*
 * @package jquery.livevalidator.js
 * @copyright (©) 2013 Wouter Vroege <wouter AT woutervroege DOT nl>
 * @author Wouter Vroege <wouter AT woutervroege DOT nl>
 */

(function($) {

    "use strict";

    /*
    main function
    */

    $.fn.livevalidate = function(options) {

        var that = this;
        that.options = options;

        /*
        set that.config
        */

        if (!options) {
            that.config = getDefaultSettings();
        } else {
            that.config = {
                errorClass: that.options.errorClass || getErrorClass(),
                successClass: that.options.successClass || getSuccessClass(),
                onError: that.options.onError || getOnError,
                onSuccess: that.options.onSuccess || getOnSuccess,
                onSelectFile: that.options.onSelectFile,
                preventSubmit: that.options.preventSubmit || getPreventSubmit(),
                slideToError: that.options.slideToError || getSlideToError(),
                submitButton: that.options.submitButton || getSubmitButton()
            }
        }

        /*
        attach event listeners
        */

        that.find("input, textarea, select").bind("keyup change focusout", function() {
            validateElement($(this));
        })

        that.find("input[type=file]").bind("change keyup", function() {
            if ($(this).data("accept")) {
                var allowedExts = $(this).data("accept").toLowerCase().replace(/\s/g, "").split(",");
                var fileChunks = $(this).val().split(/\./g);
                var fileExt = $(this).val().split(/\./g)[fileChunks.length - 1].toLowerCase();
                for (var i in allowedExts)
                    if (fileExt === allowedExts[i]) {
                        return processFile(this);
                        break;
                    }
                rejectElement($(this));
                $(this).removeAttr("data-value");
                that.config.onSelectFile({
                    element: $(this),
                    message: "invalid file extension, accepted file extensions are: " + allowedExts.join(", ")
                });
            }
        });

        that.find(that.config.submitButton).click(function(e) {
            e.preventDefault();
            validateAll();
        })


        /*
    iterate
    */

        function validateAll() {
            that.find("input, textarea, select").trigger("keyup");
            var e = getErrors();
            if (e.count > 0) {
                that.config.onError(e);
                if (that.config.slideToError) {
                    $("html, body").animate({
                        scrollTop: that.find("." + that.config.errorClass).first().position().top
                    }, 200);
                }

            } else {
                if (that.config.preventSubmit !== true) {
                    return that.submit();
                }
                that.config.onSuccess(getFormData());
            }
        }

        function getOnSuccess(data) {
            return console.log(data);
        }

        function getOnError(e) {
            return console.warn(e);
        }

        function getErrors() {

            var elements = {};

            that.find("." + that.config.errorClass).each(function(i, elem) {
                elements[$(this).attr("name") || "element_" + i] = true;
            })

            var numErrors = Object.keys(elements).length;

            return {
                invalidElements: elements,
                elementNames: $.map(elements, function(item, key) {
                    return key;
                }).join(", "),
                count: numErrors,
            };
            return e;

        }

        function getPreventSubmit() {
            return false;
        }

        function getSubmitButton() {
            return that.find("input[type=submit]");
        }

        function getDefaultSettings() {
            return {
                errorClass: getErrorClass(),
                successClass: getSuccessClass(),
                preventSubmit: getPreventSubmit(),
                slideToError: getSlideToError(),
                submitButton: getSubmitButton()
            }
        }

        function getErrorClass() {
            return "input-error";
        }

        function getSuccessClass() {
            return "input-success";
        }

        function getSlideToError() {
            return false;
        }

        function validateElement(el) {

            if (el.attr("type") == "submit")
                return;

            var val = el.val();
            var pattern = getPattern(el);

            /* check radio buttons */
            if (el.attr("type") == "radio")
                return validateRadioButton(el);

            /* check checkboxes */
            if (el.attr("type") == "checkbox")
                return validateCheckbox(el);

            /* check if element is a required field */
            if (!el.attr("required") && val.length === 0)
                return approveElement(el);

            /* validate field, reject if invalid */
            if (!val.match(pattern))
                return rejectElement(el);

            /* else, approve */
            approveElement(el);
        }

        function getPattern(el) {

            if (el.data("pattern"))
                return eval(el.data("pattern"));

            var inputType = el.attr("type");
            switch (inputType) {

                /*
            email input
            */
                case "email":
                    return /\S+@\S+\.\S\S+/;
                    break;

                    /*
            url input
            */

                case "url":
                    return /^(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/;
                    break;

                    /*
            date input
            */

                case "date":
                    if (!el.data("format"))
                        return /^(0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])[- /.](19|20)\d\d$/;
                    switch (el.data("format")) {
                        case "dd/mm/yyyy":
                        case "dd-mm-yyyy":
                            return /^(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d$/;
                            break;
                        default:
                            return /^(0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])[- /.](19|20)\d\d$/;
                            break;
                    }
                    break;

                    /*
            time input
            */

                case "time":
                    if (!el.data("format"))
                        return /^(([0-1][0-9]|[2][0-3])):([0-5]\d)$/;
                    switch (el.data("format")) {
                        case "hh:MM":
                        case "hh:mm":
                            return /^([0-1][0-2]):([0-5]\d)$/;
                            break;
                        case "HH:MM":
                        default:
                            return /^(([0-1][0-9]|[2][0-3])):([0-5]\d)$/;
                            break;
                    }

                    break;

                    /*
            fallback (any string, minium of 2 characters)
            */

                default:
                    return /\w{2,10}\b/;
                    break;
            }
        }

        function getFormData() {
            var jsonOutput = {}
            that.find("input:not([type=submit]), textarea, select").each(function(key, el) {
                switch ($(el).attr("type")) {
                    default: jsonOutput[$(el).attr("name") || "element_" + key] = $(el).data("value") || $(el).val()
                    break;
                    case "radio":
                        var el = that.find("input[name='" + $(el).attr('name') + "']:checked");
                        jsonOutput[el.attr("name") || "element_" + key] = el.val()
                        break;
                    case "checkbox":
                        jsonOutput[$(el).attr("name") || "element_" + key] = $.map($("input[name='" + $(el).attr("name") + "']:checked"), function(checkbox) {
                            return $(checkbox).val();
                        }).join(", ");
                        break;
                }
            })
            return jsonOutput;
        }

        function validateRadioButton(el) {
            var groupName = el.attr("name");
            var checkedElement = $("input[name=" + groupName + "]:checked");
            if (!checkedElement.val() && !el.attr("required"))
                return rejectElement(el);
            approveElement(el);
        }

        function validateCheckbox(el) {
            /*
        checkbox input
        */
            if (!el.attr("required"))
                return approveElement(el);

            if (el.is(":checked")) {
                return approveElement(el);
            }
            rejectElement(el);
        }

        function approveElement(el) {
            el.removeClass(that.config.errorClass).addClass(that.config.successClass);
        }

        function rejectElement(el) {
            el.removeClass(that.config.successClass).addClass(that.config.errorClass);
        }

        /*
    file processor
    */

        function processFile(el) {
            var self = el;
            var fileReader = new FileReader();

            fileReader.onload = function(e) {

                resizeImage(el, e.target.result, function(err, data) {
                    e = null;
                    if (err)
                        return that.config.onSelectFile(err);
                    $(self).attr("data-value", data);
                    that.config.onSelectFile(null, {
                        element: self,
                        contentType: parseContentType(data),
                        contents: data
                    });
                })
            }
            fileReader.readAsDataURL(el.files[0]);
        }

        function parseContentType(data) {
            return data.match(/^.*?:.*?;/g)[0].replace("data:", "").replace(";", "");
        }

        /*
        resize image
        */

        function resizeImage(el, imageData, callback) {

            /*define input data*/
            var data = imageData;

            /* create  temp image */
            var tempImage = new Image();

            /* init canvas elements */
            var canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d");

            /* return callback if data doesn't hold an image blob */
            if (!isImage(data)) {
                return callback(null, data);
            }

            /* if no max size is set */
            if (!$(el).data("max-size")) {
                return callback(null, data);
            }

            /* define max size */
            var maxSize = $(el).data("max-size");

            /* load the image */
            tempImage.onload = function() {
                var newSize = getResizedImageSize(tempImage, maxSize);
                tempImage.width = newSize.width;
                tempImage.height = newSize.height;

                canvas.width = newSize.width;
                canvas.height = newSize.height;

                ctx.drawImage(tempImage, 0, 0, tempImage.width, tempImage.height);

                callback(null, canvas.toDataURL("image/jpeg"));
            }

            tempImage.src = data;
        }

        function getResizedImageSize(image, maxSize) {
            if (image.width > image.height) {
                var scaleRatio = maxSize / image.width;
            } else {
                var scaleRatio = maxSize / image.height;
            }
            return {
                width: Math.round(image.width * scaleRatio),
                height: Math.round(image.height * scaleRatio)
            }
        }

        function isImage(imageSource) {
            return imageSource.match(/^data:image\/(jpg|jpeg|png|gif)/gi);
        }

    }


}(jQuery));