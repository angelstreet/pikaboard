/**
 * QuoteWidget - Standalone floating citation widget
 * ~4KB minified | Zero dependencies | Vanilla JS
 */
(function(global) {
  'use strict';

  var DEFAULTS = {
    quotesUrl: null,        // URL to quotes.json (auto-detected if null)
    quotes: null,           // Or pass quotes array directly
    interval: 30000,        // ms between quotes
    duration: 12000,        // ms each quote is visible
    enabled: true,
    categories: [],         // empty = all
    themes: [],             // empty = all
    language: null,         // null = all, 'en', 'fr'
    animation: 'fade',      // fade | slide-left | slide-right | slide-up
    position: 'bottom-right', // bottom-right | bottom-left | top-right | top-left | bottom-center | top-center
    theme: 'dark',          // dark | light | minimal
    maxWidth: 380,
    zIndex: 9999,
    showCategory: false,
    onShow: null,           // callback(quote)
    onHide: null            // callback(quote)
  };

  function QuoteWidget(opts) {
    this.config = _merge({}, DEFAULTS, opts || {});
    this._quotes = [];
    this._filtered = [];
    this._timer = null;
    this._hideTimer = null;
    this._el = null;
    this._currentQuote = null;
    this._lastIndex = -1;
    this._ready = false;

    if (this.config.enabled) this.init();
  }

  QuoteWidget.prototype.init = function() {
    var self = this;
    this._createDOM();

    if (this.config.quotes) {
      this._quotes = this.config.quotes;
      this._applyFilters();
      this._ready = true;
      this._scheduleNext();
    } else {
      var url = this.config.quotesUrl || this._autoUrl();
      _fetchJSON(url, function(data) {
        self._quotes = data;
        self._applyFilters();
        self._ready = true;
        self._scheduleNext();
      });
    }
  };

  QuoteWidget.prototype._autoUrl = function() {
    var scripts = document.querySelectorAll('script[src*="quote-widget"]');
    if (scripts.length) {
      var src = scripts[scripts.length - 1].src;
      return src.replace(/quote-widget\.js.*$/, 'quotes.json');
    }
    return 'quotes.json';
  };

  QuoteWidget.prototype._createDOM = function() {
    if (this._el) return;
    var c = this.config;
    var el = document.createElement('div');
    el.className = 'qw-container qw-' + c.position + ' qw-theme-' + c.theme + ' qw-anim-' + c.animation + ' qw-hidden';
    el.style.maxWidth = c.maxWidth + 'px';
    el.style.zIndex = c.zIndex;
    el.innerHTML = '<div class="qw-card">' +
      '<button class="qw-close" aria-label="Close">&times;</button>' +
      '<p class="qw-text"></p>' +
      '<p class="qw-author"></p>' +
      '<p class="qw-meta"></p>' +
      '</div>';
    document.body.appendChild(el);
    this._el = el;

    var self = this;
    el.querySelector('.qw-close').addEventListener('click', function() {
      self.hide();
    });
  };

  QuoteWidget.prototype._applyFilters = function() {
    var c = this.config;
    var q = this._quotes;
    if (c.categories.length) q = q.filter(function(x) { return c.categories.indexOf(x.category) !== -1; });
    if (c.themes.length) q = q.filter(function(x) { return x.themes && x.themes.some(function(t) { return c.themes.indexOf(t) !== -1; }); });
    if (c.language) q = q.filter(function(x) { return x.language === c.language; });
    this._filtered = q;
  };

  QuoteWidget.prototype._pickRandom = function() {
    var arr = this._filtered;
    if (!arr.length) return null;
    if (arr.length === 1) return arr[0];
    var idx;
    do { idx = Math.floor(Math.random() * arr.length); } while (idx === this._lastIndex);
    this._lastIndex = idx;
    return arr[idx];
  };

  QuoteWidget.prototype.show = function(quote) {
    if (!this._el) return;
    var q = quote || this._pickRandom();
    if (!q) return;
    this._currentQuote = q;

    this._el.querySelector('.qw-text').textContent = q.text;
    this._el.querySelector('.qw-author').textContent = q.author;
    var meta = this._el.querySelector('.qw-meta');
    meta.textContent = this.config.showCategory ? (q.category || '') : '';

    // Force reflow for animation
    this._el.classList.add('qw-hidden');
    void this._el.offsetWidth;
    this._el.classList.remove('qw-hidden');

    if (this.config.onShow) this.config.onShow(q);

    var self = this;
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(function() { self.hide(); }, this.config.duration);
  };

  QuoteWidget.prototype.hide = function() {
    if (!this._el) return;
    clearTimeout(this._hideTimer);
    this._el.classList.add('qw-hidden');
    if (this.config.onHide && this._currentQuote) this.config.onHide(this._currentQuote);
  };

  QuoteWidget.prototype._scheduleNext = function() {
    var self = this;
    // Show first one quickly
    setTimeout(function() { self.show(); }, 1500);
    this._timer = setInterval(function() {
      if (self.config.enabled) self.show();
    }, this.config.interval);
  };

  QuoteWidget.prototype.start = function() {
    this.config.enabled = true;
    if (!this._ready) { this.init(); return; }
    if (!this._timer) this._scheduleNext();
  };

  QuoteWidget.prototype.stop = function() {
    this.config.enabled = false;
    clearInterval(this._timer);
    clearTimeout(this._hideTimer);
    this._timer = null;
    this.hide();
  };

  QuoteWidget.prototype.destroy = function() {
    this.stop();
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
    this._el = null;
  };

  QuoteWidget.prototype.updateConfig = function(opts) {
    _merge(this.config, opts);
    if (this._el) {
      var c = this.config;
      this._el.className = 'qw-container qw-' + c.position + ' qw-theme-' + c.theme + ' qw-anim-' + c.animation + ' qw-hidden';
      this._el.style.maxWidth = c.maxWidth + 'px';
      this._el.style.zIndex = c.zIndex;
    }
    this._applyFilters();
  };

  // Helpers
  function _merge(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var k in src) if (src.hasOwnProperty(k)) target[k] = src[k];
    }
    return target;
  }

  function _fetchJSON(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try { cb(JSON.parse(xhr.responseText)); } catch(e) { console.error('QuoteWidget: Failed to parse quotes', e); }
      }
    };
    xhr.send();
  }

  // Export
  global.QuoteWidget = QuoteWidget;

})(typeof window !== 'undefined' ? window : this);
