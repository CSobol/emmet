/**
 * Generic formatting filter: creates proper indentation for each tree node,
 * placing "%s" placeholder where the actual output should be. You can use
 * this filter to preformat tree and then replace %s placeholder to whatever you
 * need. This filter should't be called directly from editor as a part 
 * of abbreviation.
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 * @constructor
 * @memberOf __formatFilterDefine
 * @param {Function} require
 * @param {Underscore} _
 */
emmet.exec(function(require, _){
	var placeholder = '%s';
	
	function getIndentation() {
		return require('resources').getVariable('indentation');
	}
	
	/**
	 * Test if passed node has block-level sibling element
	 * @param {AbbreviationNode} item
	 * @return {Boolean}
	 */
	function hasBlockSibling(item) {
		return item.parent && require('abbreviationUtils').hasBlockChildren(item.parent);
	}
	
	/**
	 * Test if passed item is very first child in parsed tree
	 * @param {AbbreviationNode} item
	 */
	function isVeryFirstChild(item) {
		return item.parent && !item.parent.parent && !item.index();
	}
	
	/**
	 * Check if a newline should be added before element
	 * @param {AbbreviationNode} node
	 * @param {OutputProfile} profile
	 * @return {Boolean}
	 */
	function shouldAddLineBreak(node, profile) {
		var abbrUtils = require('abbreviationUtils');
		if (profile.tag_nl === true || abbrUtils.isBlock(node))
			return true;
		
		if (!node.parent || !profile.inline_break)
			return false;
		
		// check if there are required amount of adjacent inline element
		return shouldFormatInline(node.parent, profile);
}
	
	/**
	 * Need to add newline because <code>item</code> has too many inline children
	 * @param {AbbreviationNode} node
	 * @param {OutputProfile} profile
	 */
	function shouldBreakChild(node, profile) {
		// we need to test only one child element, because 
		// hasBlockChildren() method will do the rest
		return node.children.length && shouldAddLineBreak(node.children[0], profile);
	}
	
	function shouldFormatInline(node, profile) {
		var nodeCount = 0;
		var abbrUtils = require('abbreviationUtils');
		return !!_.find(node.children, function(child) {
			if (child.isTextNode() || !abbrUtils.isInline(child))
				nodeCount = 0;
			else if (abbrUtils.isInline(child))
				nodeCount++;
			
			if (nodeCount >= profile.inline_break)
				return true;
		});
	}
	
	/**
	 * Processes element with matched resource of type <code>snippet</code>
	 * @param {AbbreviationNode} item
	 * @param {OutputProfile} profile
	 * @param {Number} level Depth level
	 */
	function processSnippet(item, profile, level) {
		item.start = item.end = '';
		if (!isVeryFirstChild(item) && profile.tag_nl !== false && shouldAddLineBreak(item, profile)) {
			// check if we’re not inside inline element
			if (!require('abbreviationUtils').isInline(item.parent)) {
				item.start = require('utils').getNewline() + item.start;
			}
		}
		
		return item;
	}
	
	/**
	 * Check if we should add line breaks inside inline element
	 * @param {AbbreviationNode} node
	 * @param {OutputProfile} profile
	 * @return {Boolean}
	 */
	function shouldBreakInsideInline(node, profile) {
		var abbrUtils = require('abbreviationUtils');
		var hasBlockElems = _.any(node.children, function(child) {
			if (abbrUtils.isSnippet(child))
				return false;
			
			return !abbrUtils.isInline(child);
		});
		
		if (!hasBlockElems) {
			return shouldFormatInline(node, profile);
		}
		
		return true;
	}
	
	/**
	 * Processes element with <code>tag</code> type
	 * @param {AbbreviationNode} item
	 * @param {OutputProfile} profile
	 * @param {Number} level Depth level
	 */
	function processTag(item, profile, level) {
		item.start = item.end = placeholder;
		var utils = require('utils');
		var abbrUtils = require('abbreviationUtils');
		var isUnary = abbrUtils.isUnary(item);
		var nl = utils.getNewline();
			
		// formatting output
		if (profile.tag_nl !== false) {
			var forceNl = profile.tag_nl === true && (profile.tag_nl_leaf || item.children.length);
			
			// formatting block-level elements
			if (!item.isTextNode()) {
				if (shouldAddLineBreak(item, profile)) {
					// - do not indent the very first element
					// - do not indent first child of a snippet
					if (!isVeryFirstChild(item) && (!abbrUtils.isSnippet(item.parent) || item.index()))
						item.start = nl + item.start;
						
					if (abbrUtils.hasBlockChildren(item) || shouldBreakChild(item, profile) || (forceNl && !isUnary))
						item.end = nl + item.end;
						
					if (abbrUtils.hasTagsInContent(item) || (forceNl && !item.children.length && !isUnary))
						item.start += nl + getIndentation();
				} else if (abbrUtils.isInline(item) && hasBlockSibling(item) && !isVeryFirstChild(item)) {
					item.start = nl + item.start;
				} else if (abbrUtils.isInline(item) && shouldBreakInsideInline(item, profile)) {
					item.end = nl + item.end;
				}
				
				item.padding = getIndentation() ;
			}
		}
		
		return item;
	}
	
	/**
	 * Processes simplified tree, making it suitable for output as HTML structure
	 * @param {AbbreviationNode} tree
	 * @param {OutputProfile} profile
	 * @param {Number} level Depth level
	 */
	require('filters').add('_format', function process(tree, profile, level) {
		level = level || 0;
		var abbrUtils = require('abbreviationUtils');
		
		_.each(tree.children, function(item) {
			if (abbrUtils.isSnippet(item))
				processSnippet(item, profile, level);
			else
				processTag(item, profile, level);
			
			process(item, profile, level + 1);
		});
		
		return tree;
	});
});