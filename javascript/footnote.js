var removeElement = function(element) {
    element.parentElement.removeChild(element);
};

var processOutOfBoundsClicks = function() {
    var footnoteContents = document.querySelectorAll('.footnote-content');
    for (var i = 0; i < footnoteContents.length; i++) {
        var item = footnoteContents[i];
        removeElement(item);
    }
};

var processFootnoteClicks = function(event) {
    if (!event.target.matches('.post-content a.footnote')) { return; }

    processOutOfBoundsClicks();

    // This is the id of the element containing the footnote content.
    var elementId = (new URL(event.target.href)).hash.substr(1);
    
    // Add the new footnote element.
    var elem = document.createElement('aside');
    elem.classList.add('footnote-content');
    elem.innerHTML = document.getElementById(elementId).innerHTML;
    removeElement(elem.querySelector('.reversefootnote'));

    event.target.parentElement.appendChild(elem);
};

var preprocessFootnoteClick = function(event) {
    if (!event.target.matches('.post-content a.footnote')) { return; }
    // Don't scroll down to the bottom of the document.
    event.preventDefault();
};

var shouldRemoveFootnotes = function(event) {
    // if we're clicking inside of a footnote, then don't remove it.
    var allFootnotes = document.querySelectorAll('.footnote-content');
    for (var i = 0; i < allFootnotes.length; i++) {
        if (allFootnotes[i].contains(event.target)) { return false }
    }

    // if we're not clicking on a footnote link, then should remove footnotes.
    if (!event.target.matches('.post-content a.footnote')) { return true; }
    
    // if we are clicking on a footnote link, then remove footnotes if this link is showing a footnote.
    return event.target.parentElement.querySelector('.footnote-content');
};

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
        preprocessFootnoteClick(event);
        if (shouldRemoveFootnotes(event)) {
            processOutOfBoundsClicks(); // remove any footnote elements we're showing.
        } else {
            processFootnoteClicks(event);
        }
        return !event.target.matches('.post-content a.footnote');
    });
});
