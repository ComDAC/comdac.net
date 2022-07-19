'use strict';

const emptyGuid = "00000000-0000-0000-0000-000000000000";

function documentReady(f) {
    window.addEventListener("load", f);
}

function populateDom(dom) {
    Object.keys(dom).forEach(function (key) {
        dom[key] = document.getElementById(key);
    });
}

function download(link) {
    var a = document.createElement('a');
    a.href = link;
    a.setAttribute("download", "");

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function emptyNode(node) {
    while (node.hasChildNodes()) {
        node.removeChild(node.firstChild);
    }
}

let ajax = function (options) {
    class objAjax {
        constructor(options) {
            let doneEvent = null;
            let failEvent = null;
            let progressEvent = null;
            const oAJAX = new XMLHttpRequest();
            const token = document.getElementsByName("__RequestVerificationToken");

            this.done = function (f) {
                if (typeof (f) === 'function') {
                    doneEvent = f;
                }
                return this;
            };

            this.fail = function (f) {
                if (typeof (f) === 'function') {
                    failEvent = f;
                }
                return this;
            };

            this.progress = function (f) {
                if (typeof (f) === 'function') {
                    progressEvent = f;
                }
                return this;
            };

            if (!options.method) {
                options.method = "POST";
            }

            if (!options.url) {
                throw "Invalid ajax url";
            }

            if (options.isJSON === undefined) {
                options.isJSON = true;
            }

            if (options.async === undefined) {
                options.async = true;
            }

            oAJAX.onreadystatechange = function () {
                if (oAJAX.readyState === 4) {
                    const resp = oAJAX.responseText;

                    if (oAJAX.status === 200) {
                        if (doneEvent !== null) {
                            if ((options.isJSON) && (resp) && (resp.length > 0)) {
                                doneEvent(JSON.parse(resp));
                            } else {
                                doneEvent(resp);
                            }
                        }
                    } else if (failEvent !== null) {
                        failEvent(resp, oAJAX.status);
                    }
                }
            };

            if (options.files) {
                oAJAX.upload.onprogress = function (e) {
                    if (progressEvent !== null) {
                        progressEvent(e.loaded / e.total * 100);
                    }
                };
            }

            oAJAX.open(options.method, options.url, options.async);

            if ((token) && (token[0])) {
                oAJAX.setRequestHeader("RequestVerificationToken", token[0].value);
            }

            if (options.files) {
                const formData = new FormData();

                //process data that might be added here.
                if (options.data) {
                    for (let prop in options.data) {
                        if (Object.prototype.hasOwnProperty.call(options.data, prop)) {
                            formData.append(prop, options.data[prop]);
                        }
                    }
                }

                for (let i = 0, l = options.files.length; i < l; i++) {
                    formData.append('files[]', options.files[i]);
                }

                oAJAX.send(formData);

            } else if (options.data) {
                oAJAX.setRequestHeader("Content-Type", "application/json");
                oAJAX.send(JSON.stringify(options.data));

            } else {
                oAJAX.send(null);

            }
        }
    }

    return new objAjax(options);
}