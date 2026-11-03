const CompositeXform = require('../../composite-xform');

const CfRuleXform = require('./cf-rule-xform');

class ConditionalFormattingXform extends CompositeXform {
  constructor() {
    super();

    this.map = {
      cfRule: new CfRuleXform(),
    };
  }

  get tag() {
    return 'conditionalFormatting';
  }

  render(xmlStream, model) {
    // only emit the wrapper when at least one rule can be rendered;
    // an empty conditionalFormatting element corrupts the sheet
    if (!model.rules.some(CfRuleXform.isRenderable)) {
      return;
    }

    xmlStream.openNode(this.tag, {sqref: model.ref});

    model.rules.forEach(rule => {
      if (CfRuleXform.isRenderable(rule)) {
        rule.ref = model.ref;
        this.map.cfRule.render(xmlStream, rule);
      }
    });

    xmlStream.closeNode();
  }

  createNewModel({attributes}) {
    return {
      ref: attributes.sqref,
      rules: [],
    };
  }

  onParserClose(name, parser) {
    this.model.rules.push(parser.model);
  }
}

module.exports = ConditionalFormattingXform;
