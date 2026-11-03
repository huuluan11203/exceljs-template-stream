const XmlStream = require('../../../utils/xml-stream');
const BaseXform = require('../base-xform');

// Captures an arbitrary XML subtree and replays it verbatim. Used for drawing
// anchors that ExcelJS does not model (charts, shapes, content parts) so they
// survive a template round-trip through the streaming writer.
class RawXform extends BaseXform {
  constructor() {
    super();

    this._stream = null;
    this._depth = 0;
  }

  reset() {
    super.reset();

    this._stream = null;
    this._depth = 0;
  }

  parseOpen(node) {
    if (!this._stream) {
      this._stream = new XmlStream();
    }
    this._stream.openNode(node.name, node.attributes);
    this._depth++;
    return true;
  }

  parseText(text) {
    if (this._stream) {
      this._stream.writeText(text);
    }
  }

  parseClose() {
    if (!this._stream) {
      return false;
    }
    this._depth--;
    this._stream.closeNode();
    if (this._depth > 0) {
      return true;
    }
    this.model = {rawXml: this._stream.xml};
    this._stream = null;
    return false;
  }
}

module.exports = RawXform;
