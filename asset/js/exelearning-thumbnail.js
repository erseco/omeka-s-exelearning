/**
 * eXeLearning Thumbnail Replacer for Omeka S
 *
 * Replaces default thumbnails with custom eXeLearning icon for items
 * that contain .elpx media files.
 */
(function() {
    'use strict';

    var elpxThumbnailUrl = null;

    /**
     * Get the module's thumbnail URL from a data attribute.
     */
    function getElpxThumbnailUrl() {
        if (elpxThumbnailUrl) {
            return elpxThumbnailUrl;
        }

        elpxThumbnailUrl = document.documentElement.getAttribute('data-exelearning-thumbnail');
        return elpxThumbnailUrl;
    }

    /**
     * Get item IDs that contain eXeLearning media (injected by server).
     */
    function getExeItemIds() {
        return window.exelearningItemIds || [];
    }

    /**
     * Extract item ID from a URL like /admin/item/14 or /admin/item/14/edit
     */
    function extractItemId(url) {
        if (!url) return null;
        var match = url.match(/\/item\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Extract media ID from a URL like /admin/media/15
     */
    function extractMediaId(url) {
        if (!url) return null;
        var match = url.match(/\/media\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Check if a thumbnail element is for an eXeLearning item.
     */
    function isElpxResource(element) {
        var exeItemIds = getExeItemIds();

        // Method 1: Check the parent link for item ID
        var link = element.closest('a');
        if (link) {
            var href = link.getAttribute('href') || '';

            // Check if this is an item link
            var itemId = extractItemId(href);
            if (itemId && exeItemIds.indexOf(itemId) !== -1) {
                return true;
            }

            // Check if href directly contains .elpx (for media pages)
            if (href.includes('.elpx')) {
                return true;
            }
        }

        // Method 2: Check the row for any item links
        var row = element.closest('tr, .resource, .media');
        if (row) {
            var itemLinks = row.querySelectorAll('a[href*="/item/"]');
            for (var i = 0; i < itemLinks.length; i++) {
                var itemId = extractItemId(itemLinks[i].getAttribute('href'));
                if (itemId && exeItemIds.indexOf(itemId) !== -1) {
                    return true;
                }
            }

            // Also check row text for .elpx (media list views)
            var text = row.textContent || '';
            if (text.includes('.elpx')) {
                return true;
            }
        }

        // Method 3: Check for media type indicator
        var mediaType = element.closest('[data-media-type]');
        if (mediaType) {
            var type = mediaType.getAttribute('data-media-type');
            if (type === 'application/zip' || type === 'application/x-zip-compressed') {
                // This could be an eXeLearning file, check parent for more context
                var parentRow = mediaType.closest('tr, .resource');
                if (parentRow) {
                    var mediaLinks = parentRow.querySelectorAll('a[href*="/media/"]');
                    for (var j = 0; j < mediaLinks.length; j++) {
                        var title = mediaLinks[j].getAttribute('title') || mediaLinks[j].textContent || '';
                        if (title.includes('.elpx')) {
                            return true;
                        }
                    }
                }
            }
        }

        // Method 4: Check sibling elements for .elpx filename
        var resourceLink = element.closest('.resource-link');
        if (resourceLink) {
            var siblings = resourceLink.parentElement ? resourceLink.parentElement.children : [];
            for (var k = 0; k < siblings.length; k++) {
                if ((siblings[k].textContent || '').includes('.elpx')) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Replace default thumbnails with eXeLearning icon.
     */
    function replaceThumbnails() {
        var thumbnailUrl = getElpxThumbnailUrl();
        if (!thumbnailUrl) {
            return;
        }

        // Find all default thumbnails
        var defaultThumbnails = document.querySelectorAll(
            'img[src*="default.png"], img[src*="thumbnails/default"]'
        );

        defaultThumbnails.forEach(function(img) {
            // Skip if already replaced
            if (img.dataset.exelearningProcessed) {
                return;
            }

            if (isElpxResource(img)) {
                img.src = thumbnailUrl;
                img.alt = 'eXeLearning';
                img.dataset.exelearningProcessed = 'true';
            }
        });
    }

    /**
     * Initialize and observe for dynamic content.
     */
    function init() {
        // Replace existing thumbnails
        replaceThumbnails();

        // Observe for dynamically loaded content
        var observer = new MutationObserver(function(mutations) {
            var shouldReplace = false;
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length > 0) {
                    shouldReplace = true;
                }
            });
            if (shouldReplace) {
                replaceThumbnails();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
