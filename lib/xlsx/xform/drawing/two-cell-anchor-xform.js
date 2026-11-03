const BaseCellAnchorXform = require('./base-cell-anchor-xform');
const StaticXform = require('../static-xform');

const CellPositionXform = require('./cell-position-xform');
const PicXform = require('./pic-xform');
const RawXform = require('./raw-xform');

class TwoCellAnchorXform extends BaseCellAnchorXform {
  constructor() {
    super();

    this.map = {
      'xdr:from': new CellPositionXform({tag: 'xdr:from'}),
      'xdr:to': new CellPositionXform({tag: 'xdr:to'}),
      'xdr:pic': new PicXform(),
      'xdr:clientData': new StaticXform({tag: 'xdr:clientData'}),
    };
  }

  get tag() {
    return 'xdr:twoCellAnchor';
  }

  reset() {
    super.reset();

    this._rawXform = undefined;
  }

  prepare(model, options) {
    if (model.type === 'raw') {
      return;
    }
    this.map['xdr:pic'].prepare(model.picture, options);
  }

  render(xmlStream, model) {
    if (model.type === 'raw') {
      xmlStream.openNode(this.tag, {editAs: model.range.editAs});
      this.map['xdr:from'].render(xmlStream, model.range.tl);
      this.map['xdr:to'].render(xmlStream, model.range.br);
      xmlStream.writeXml(model.rawXml);
      this.map['xdr:clientData'].render(xmlStream, {});
      xmlStream.closeNode();
      return;
    }

    xmlStream.openNode(this.tag, {editAs: model.range.editAs || 'oneCell'});

    this.map['xdr:from'].render(xmlStream, model.range.tl);
    this.map['xdr:to'].render(xmlStream, model.range.br);
    this.map['xdr:pic'].render(xmlStream, model.picture);
    this.map['xdr:clientData'].render(xmlStream, {});

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
          range: {
            editAs: node.attributes.editAs,
          },
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
        this.model.rawXml = (this.model.rawXml || '') + this._rawXform.model.rawXml;
        this._rawXform = undefined;
      }
      return true;
    }
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        this.parser = undefined;
      }
      return true;
    }
    switch (name) {
      case this.tag:
        this.model.range.tl = this.map['xdr:from'].model;
        this.model.range.br = this.map['xdr:to'].model;
        this.model.picture = this.map['xdr:pic'].model;
        if (this.model.rawXml) {
          this.model.type = 'raw';
        }
        return false;
      default:
        // could be some unrecognised tags
        return true;
    }
  }

  reconcile(model, options) {
    if (model.type === 'raw') {
      return;
    }
    model.medium = this.reconcilePicture(model.picture, options);
  }
}

module.exports = TwoCellAnchorXform;
