const colCache = require('../../../utils/col-cache');
const XmlStream = require('../../../utils/xml-stream');

const BaseXform = require('../base-xform');
const TwoCellAnchorXform = require('./two-cell-anchor-xform');
const OneCellAnchorXform = require('./one-cell-anchor-xform');
const RawXform = require('./raw-xform');

function getAnchorType(model) {
  const range = typeof model.range === 'string' ? colCache.decode(model.range) : model.range;

  return range.br ? 'xdr:twoCellAnchor' : 'xdr:oneCellAnchor';
}

class DrawingXform extends BaseXform {
  constructor() {
    super();

    this.map = {
      'xdr:twoCellAnchor': new TwoCellAnchorXform(),
      'xdr:oneCellAnchor': new OneCellAnchorXform(),
    };
  }

  reset() {
    super.reset();

    this._rawXform = undefined;
  }

  prepare(model) {
    model.anchors.forEach((item, index) => {
      if (item.type === 'raw') {
        return;
      }
      item.anchorType = getAnchorType(item);
      const anchor = this.map[item.anchorType];
      anchor.prepare(item, {index});
    });
  }

  get tag() {
    return 'xdr:wsDr';
  }

  render(xmlStream, model) {
    xmlStream.openXml(XmlStream.StdDocAttributes);
    xmlStream.openNode(this.tag, DrawingXform.DRAWING_ATTRIBUTES);

    model.anchors.forEach(item => {
      let {anchorType} = item;
      if (!anchorType && item.range) {
        anchorType = item.range.br ? 'xdr:twoCellAnchor' : 'xdr:oneCellAnchor';
      }
      const anchor = this.map[anchorType];
      if (anchor) {
        anchor.render(xmlStream, item);
        return;
      }
      xmlStream.writeXml(item.rawXml);
    });

    xmlStream.closeNode();
  }

  parseOpen(node) {
    if (this._rawXform) {
      this._rawXform.parseOpen(node);
      return true;
    }
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case this.tag:
        this.reset();
        this.model = {
          anchors: [],
        };
        break;
      default:
        this.parser = this.map[node.name];
        if (this.parser) {
          this.parser.parseOpen(node);
        } else {
          this._rawXform = new RawXform();
          this._rawXform.parseOpen(node);
        }
        break;
    }
    return true;
  }

  parseText(text) {
    if (this._rawXform) {
      this._rawXform.parseText(text);
      return;
    }
    if (this.parser) {
      this.parser.parseText(text);
    }
  }

  parseClose(name) {
    if (this._rawXform) {
      if (!this._rawXform.parseClose(name)) {
        this.model.anchors.push({type: 'raw', rawXml: this._rawXform.model.rawXml});
        this._rawXform = undefined;
      }
      return true;
    }
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        this.model.anchors.push(this.parser.model);
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case this.tag:
        return false;
      default:
        // could be some unrecognised tags
        return true;
    }
  }

  reconcile(model, options) {
    model.anchors.forEach(anchor => {
      if (anchor.type === 'raw') {
        return;
      }
      if (anchor.br) {
        this.map['xdr:twoCellAnchor'].reconcile(anchor, options);
      } else {
        this.map['xdr:oneCellAnchor'].reconcile(anchor, options);
      }
    });
  }
}

DrawingXform.DRAWING_ATTRIBUTES = {
  'xmlns:xdr': 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
  'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
};

module.exports = DrawingXform;
