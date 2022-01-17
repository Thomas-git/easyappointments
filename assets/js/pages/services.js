/* ----------------------------------------------------------------------------
 * Easy!Appointments - Open Source Web Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.0.0
 * ---------------------------------------------------------------------------- */

/**
 * Services page.
 *
 * This module implements the functionality of the services page.
 */
App.Pages.Services = (function () {
    const $services = $('#services');
    const $name = $('#service-name');
    const $duration = $('#service-duration');
    const $price = $('#service-price');
    const $currency = $('#service-currency');
    const $category = $('#service-category');
    const $availabilitiesType = $('#service-availabilities-type');
    const $attendantsNumber = $('#service-attendants-number');
    const $location = $('#service-location');
    const $description = $('#service-description');
    const $filterServices = $('#filter-services');
    let filterResults = {};
    let filterLimit = 20;

    /**
     * Add page event listeners.
     */
    function addEventListeners() {
        /**
         * Event: Filter Services Form "Submit"
         *
         * @param {jQuery.Event} event
         */
        $services.on('submit', '#filter-services form', function (event) {
            event.preventDefault();
            const key = $filterServices.find('.key').val();
            $filterServices.find('.selected').removeClass('selected');
            resetForm();
            filter(key);
        });

        /**
         * Event: Filter Service Row "Click"
         *
         * Display the selected service data to the user.
         */
        $services.on('click', '.service-row', function () {
            if ($filterServices.find('.filter').prop('disabled')) {
                $filterServices.find('.results').css('color', '#AAA');
                return; // exit because we are on edit mode
            }

            const serviceId = $(this).attr('data-id');

            const service = filterResults.find(function (filterResult) {
                return Number(filterResult.id) === Number(serviceId);
            });

            // Add dedicated provider link.
            const dedicatedUrl = App.Utils.Url.siteUrl('?service=' + encodeURIComponent(service.id));

            const $link = $('<a/>', {
                'href': dedicatedUrl,
                'html': [
                    $('<span/>', {
                        'class': 'fas fa-link'
                    })
                ]
            });

            $services.find('.record-details h3').find('a').remove().end().append($link);

            display(service);
            $filterServices.find('.selected').removeClass('selected');
            $(this).addClass('selected');
            $('#edit-service, #delete-service').prop('disabled', false);
        });

        /**
         * Event: Add New Service Button "Click"
         */
        $services.on('click', '#add-service', function () {
            resetForm();
            $services.find('.add-edit-delete-group').hide();
            $services.find('.save-cancel-group').show();
            $services.find('.record-details').find('input, select, textarea').prop('disabled', false);
            $filterServices.find('button').prop('disabled', true);
            $filterServices.find('.results').css('color', '#AAA');

            // Default values
            $name.val('Service');
            $duration.val('30');
            $price.val('0');
            $currency.val('');
            $category.val('');
            $availabilitiesType.val('flexible');
            $attendantsNumber.val('1');
        });

        /**
         * Event: Cancel Service Button "Click"
         *
         * Cancel add or edit of a service record.
         */
        $services.on('click', '#cancel-service', function () {
            const id = $id.val();

            resetForm();

            if (id !== '') {
                select(id, true);
            }
        });

        /**
         * Event: Save Service Button "Click"
         */
        $services.on('click', '#save-service', function () {
            const service = {
                name: $name.val(),
                duration: $duration.val(),
                price: $price.val(),
                currency: $currency.val(),
                description: $description.val(),
                location: $location.val(),
                availabilities_type: $availabilitiesType.val(),
                attendants_number: $attendantsNumber.val(),
                id_categories: $category.val() || null
            };

            if ($id.val() !== '') {
                service.id = $id.val();
            }

            if (!validate()) {
                return;
            }

            save(service);
        });

        /**
         * Event: Edit Service Button "Click"
         */
        $services.on('click', '#edit-service', function () {
            $services.find('.add-edit-delete-group').hide();
            $services.find('.save-cancel-group').show();
            $services.find('.record-details').find('input, select, textarea').prop('disabled', false);
            $filterServices.find('button').prop('disabled', true);
            $filterServices.find('.results').css('color', '#AAA');
        });

        /**
         * Event: Delete Service Button "Click"
         */
        $services.on('click', '#delete-service', function () {
            const serviceId = $id.val();
            const buttons = [
                {
                    text: App.Lang.cancel,
                    click: () => {
                        $('#message-box').dialog('close');
                    }
                },
                {
                    text: App.Lang.delete,
                    click: () => {
                        remove(serviceId);
                        $('#message-box').dialog('close');
                    }
                }
            ];

            App.Utils.Message.show(App.Lang.delete_service, App.Lang.delete_record_prompt, buttons);
        });
    }

    /**
     * Save service record to database.
     *
     * @param {Object} service Contains the service record data. If an 'id' value is provided
     * then the update operation is going to be executed.
     */
    function save(service) {
        App.Http.Services.save(service).then((response) => {
            App.Layouts.Backend.displayNotification(App.Lang.service_saved);
            resetForm();
            $filterServices.find('.key').val('');
            filter('', response.id, true);
        });
    }

    /**
     * Delete a service record from database.
     *
     * @param {Number} id Record ID to be deleted.
     */
    function remove(id) {
        App.Http.Services.destroy(id).then(() => {
            App.Layouts.Backend.displayNotification(App.Lang.service_deleted);
            resetForm();
            filter($filterServices.find('.key').val());
        });
    }

    /**
     * Validates a service record.
     *
     * @return {Boolean} Returns the validation result.
     */
    function validate() {
        $services.find('.is-invalid').removeClass('is-invalid');
        $services.find('.form-message').removeClass('alert-danger').hide();

        try {
            // Validate required fields.
            let missingRequired = false;

            $services.find('.required').each((index, requiredField) => {
                if (!$(requiredField).val()) {
                    $(requiredField).addClass('is-invalid');
                    missingRequired = true;
                }
            });

            if (missingRequired) {
                throw new Error(App.Lang.fields_are_required);
            }

            // Validate the duration.
            if (Number($duration.val()) < 5) {
                $duration.addClass('is-invalid');
                throw new Error(App.Lang.invalid_duration);
            }

            return true;
        } catch (error) {
            $services.find('.form-message').addClass('alert-danger').text(error.message).show();
            return false;
        }
    }

    /**
     * Resets the service tab form back to its initial state.
     */
    function resetForm() {
        $filterServices.find('.selected').removeClass('selected');
        $filterServices.find('button').prop('disabled', false);
        $filterServices.find('.results').css('color', '');

        $services.find('.record-details').find('input, select, textarea').val('').prop('disabled', true);
        $services.find('.record-details h3 a').remove();

        $services.find('.add-edit-delete-group').show();
        $services.find('.save-cancel-group').hide();
        $('#edit-service, #delete-service').prop('disabled', true);

        $services.find('.record-details .is-invalid').removeClass('is-invalid');
        $services.find('.record-details .form-message').hide();
    }

    /**
     * Display a service record into the service form.
     *
     * @param {Object} service Contains the service record data.
     */
    function display(service) {
        $id.val(service.id);
        $name.val(service.name);
        $duration.val(service.duration);
        $price.val(service.price);
        $currency.val(service.currency);
        $description.val(service.description);
        $location.val(service.location);
        $availabilitiesType.val(service.availabilities_type);
        $attendantsNumber.val(service.attendants_number);

        const categoryId = service.id_categories !== null ? service.id_categories : '';
        $category.val(categoryId);
    }

    /**
     * Filters service records depending a string keyword.
     *
     * @param {String} keyword This is used to filter the service records of the database.
     * @param {Number} selectId Optional, if set then after the filter operation the record with this
     * ID will be selected (but not displayed).
     * @param {Boolean} show Optional (false), if true then the selected record will be displayed on the form.
     */
    function filter(keyword, selectId = null, show = false) {
        App.Http.Services.search(keyword, filterLimit).then((response) => {
            filterResults = response;

            $filterServices.find('.results').empty();

            response.forEach((service) => {
                $filterServices.find('.results').append(getFilterHtml(service)).append($('<hr/>'));
            });

            if (response.length === 0) {
                $filterServices.find('.results').append(
                    $('<em/>', {
                        'text': App.Lang.no_records_found
                    })
                );
            } else if (response.length === filterLimit) {
                $('<button/>', {
                    'type': 'button',
                    'class': 'btn btn-outline-secondary w-100 load-more text-center',
                    'text': App.Lang.load_more,
                    'click': () => {
                        filterLimit += 20;
                        filter(keyword, selectId, show);
                    }
                }).appendTo('#filter-services .results');
            }

            if (selectId) {
                select(selectId, show);
            }
        });
    }

    /**
     * Get Filter HTML
     *
     * Get a service row HTML code that is going to be displayed on the filter results list.
     *
     * @param {Object} service Contains the service record data.
     *
     * @return {String} The HTML code that represents the record on the filter results list.
     */
    function getFilterHtml(service) {
        const name = service.name;

        const info = service.duration + ' min - ' + service.price + ' ' + service.currency;

        return $('<div/>', {
            'class': 'service-row entry',
            'data-id': service.id,
            'html': [
                $('<strong/>', {
                    'text': name
                }),
                $('<br/>'),
                $('<span/>', {
                    'text': info
                }),
                $('<br/>')
            ]
        });
    }

    /**
     * Select a specific record from the current filter results. If the service id does not exist
     * in the list then no record will be selected.
     *
     * @param {Number} id The record id to be selected from the filter results.
     * @param {Boolean} show Optional (false), if true then the method will display the record on the form.
     */
    function select(id, show = false) {
        $filterServices.find('.selected').removeClass('selected');

        $filterServices.find('.service-row[data-id="' + id + '"]').addClass('selected');

        if (show) {
            const service = filterResults.find(function (filterResult) {
                return Number(filterResult.id) === Number(id);
            });

            display(service);

            $('#edit-service, #delete-service').prop('disabled', false);
        }
    }

    /**
     * Update the service category list box.
     *
     * Use this method every time a change is made to the service categories db table.
     */
    function updateAvailableCategories() {
        App.Http.Categories.search('', 999).then((response) => {
            var $select = $('#service-category');

            $select.empty();

            response.forEach((category) => {
                $select.append(new Option(category.name, category.id));
            });

            $select.append(new Option('- ' + App.Lang.no_category + ' -', '')).val('');
        });
    }

    /**
     * Initialize the module.
     */
    function initialize() {
        resetForm();
        filter('');
        addEventListeners();
        updateAvailableCategories();
    }

    document.addEventListener('DOMContentLoaded', initialize);

    return {
        filter,
        save,
        remove,
        getFilterHtml,
        resetForm,
        select
    };
})();