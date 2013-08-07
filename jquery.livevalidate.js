"use strict";

(function($) {

    /*
     * @package jquery.livevalidator.js
     * @copyright (©) 2013 Wouter Vroege <wouter AT woutervroege DOT nl>
     * @author Wouter Vroege <wouter AT woutervroege DOT nl>
     */

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
                onError: that.options.onError,
                onSuccess: that.options.onSuccess,
                onSelectFile: that.options.onSelectFile,
                preventSubmit: that.options.preventSubmit || getPreventSubmit(),
                slideToError: that.options.slideToError || getSlideToError()
            }
        }

        /*
        attach event listeners
        */

        that.find("input, textarea").bind("keyup change focusout", function(e) {
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
                that.config.onSelectFile("invalid file extension, accepted file extensions are: " + allowedExts.join(", "));
            }
        });

        that.find($("input[type=submit]")).click(function(e) {
            e.preventDefault();
            validateAll();
        })


        /*
    iterate
    */

        function validateAll() {
            that.find("input, textarea").trigger("keyup");
            var n = getNumErrors();
            if (n > 0) {
                that.config.onError(n);
                if (that.config.slideToError) {
                    $("html, body").animate({
                        scrollTop: that.find(".input-error").first().position().top
                    }, 200);
                }

            } else {
                if (that.config.preventSubmit !== true) {
                    return that.submit();
                }
                that.config.onSuccess(getFormData());
            }
        }

        function getNumErrors() {
            var num_errors = that.find(".input-error").length;
            return num_errors;
        }

        function getPreventSubmit() {
            return false;
        }

        function getDefaultSettings() {
            return {
                errorClass: getErrorClass(),
                successClass: getSuccessClass(),
                preventSubmit: getPreventSubmit(),
                slideToError: getSlideToError()
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

            if (el.attr("type") == "password")
                return /^(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*[\d])(?=.*[\W]).*$/;

            var inputType = el.data("type");
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
            that.find("input:not([type=submit]), textarea").each(function(key, el) {
                jsonOutput[$(el).attr("id") || "element_" + key] = $(el).data("value") || $(el).val()
            })
            return jsonOutput;
        }

        function validateCheckbox(el) {
            /*
        checkbox input
        */
            if (el.is(":checked")) {
                return approveElement(el);
            }
            rejectElement(el);
        }

        function approveElement(el) {
            el.removeClass("input-error").addClass(that.config.successClass);
        }

        function rejectElement(el) {
            el.removeClass(that.config.successClass).addClass(that.config.errorClass);
        }

        /*
    file processor
    */

        function processFile(el) {
            var self = el;
            var canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d"),
                fileReader = new FileReader();

            fileReader.onload = function(e) {
                $(self).attr("data-value", e.target.result);
                that.config.onSelectFile(null, {
                    element: el,
                    contentType: parseContentType(e.target.result),
                    contents: e.target.result
                });
            }
            fileReader.readAsDataURL(el.files[0]);
        }

        function parseContentType(data) {
            return data.match(/^.*?:.*?;/g)[0].replace("data:", "").replace(";", "");
        }

    }


}(jQuery));