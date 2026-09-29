//--------------------------------------------------------------------------
//                                                                        
//    This file is part of GenePool Swimbots.                             
//    Copyright (c) 2021 by Jeffrey Ventrella - All Rights Reserved.      
//                                                                        
//    See the README file or go to swimbots.com for full license details.           
//    You may use, distribute, and modify this code only under the terms  
//    of the "Commons Clause" license (commonsclause.com).                
//                                                                        
//    This software is intended for education, game design, and research. 
//                                                                        
// -------------------------------------------------------------------------- 

"use strict";

//------------------------
// Food bit rendering
//------------------------
function FoodBitRenderer( glView )
{
	const FOOD_BIT_SQUASH   = 1.0;		// round
	const FOOD_BIT_EMISSIVE = 0.45;		// food glows a little

	let _canvas = null;

	//-------------------------------------
	// initialize - one time setup
	//-------------------------------------
	this.initialize = function ( canvas ) {
		_canvas = canvas;
	}

	//	dispose of render assets for a given foodbit
	this.releaseRenderAssets = function( foodBit ) {
		//	food bits are drawn as instances - no per-foodbit assets
	}

	this.render = function( foodBit, isSelected, isMouseOver, camera )
	{
		let viewScale = camera.getScale();
		let bitScale  = foodBit.getSizeViewScale();
	    let radius    = foodBit.getSize() + viewScale * bitScale * bitScale;
		let position  = foodBit.getPosition();

		glView.addSphere( position.x, position.y, radius, ZERO, FOOD_BIT_SQUASH, foodBit.getColor(), FOOD_BIT_EMISSIVE );
    }
}
