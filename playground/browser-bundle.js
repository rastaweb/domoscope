/**
 * Domoscope Browser Bundle
 *
 * This is a standalone browser-compatible version of the Domoscope library.
 * It wraps the ES module exports in an IIFE (Immediately Invoked Function Expression)
 * to make them available as a global `domoscope` object.
 */

// Import all the functionality
import * as DomoScope from '../dist/index.js';

// Create a global domoscope object
window.domoscope = DomoScope;

// For backwards compatibility, also expose individual functions
Object.assign(window.domoscope, DomoScope);

console.log('Domoscope library loaded successfully!');
