let pageObj;

export function registerPage(page) {
    if (pageObj) {
        if (pageObj.onResize) window.removeEventListener("resize", pageObj.onResize);
        if (pageObj.onClose) window.removeEventListener("close", pageObj.onClose);

        pageObj = null;
    }

    pageObj = new page();

    window.addEventListener("load", pageLoad);
    
    if (pageObj.onResize) window.addEventListener("resize", pageObj.onResize);
    if (pageObj.onClose) window.addEventListener("close", pageObj.onClose);
}

function pageLoad() {
    if (pageObj.dom) populateDom(pageObj.dom);

    if (pageObj.onLoad) pageObj.onLoad();
}

function populateDom(dom) {
    Object.keys(dom).forEach((key) => {
        dom[key] = document.querySelector("#" + key);
    });
}