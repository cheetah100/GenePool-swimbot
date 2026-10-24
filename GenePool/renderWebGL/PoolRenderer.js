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

//--------------------------------------------------
// poolRenderer
//--------------------------------------------------
function PoolRenderer( glView )
{
    const TOUCH_RIPPLE_DURATION	    = 0.3;
    const MAX_TOUCH_RIPPLE_RADIUS   = 0.04;
    const OBSTACLE_SQUASH           = 0.6;

	let _canvas = null;

	//----------------------------------
	// initialize - one time setup
	//----------------------------------
	this.initialize = function( canvas )
	{
		_canvas = canvas;
    }
    
	//------------------------------------------------
	// render
	//------------------------------------------------
	this.render = function( pool, seconds, viewport )
	{
		//------------------------------------------------------
		// pool floor and boundary are drawn by the GL view
		//------------------------------------------------------
		glView.setPool( pool.getBoundaries(), pool.getBoundaryMargin(), pool.getColor(), pool.getBoundaryMarginColor(), viewport.getScale() );

        let lineWidth = 0.005 + 0.001 * viewport.getScale(); 	

		//------------------------------------------------------------
		// show touch (on the 2D overlay)
		//------------------------------------------------------------
		let touch = pool.getTouch();
		if ( ( seconds - touch.time ) < TOUCH_RIPPLE_DURATION )
		{
			let f = ( seconds - touch.time ) / TOUCH_RIPPLE_DURATION;

			if ( touch.down )
			{
				touch.radius = MAX_TOUCH_RIPPLE_RADIUS * ( ONE - f );
			}
			else
			{
				touch.radius = MAX_TOUCH_RIPPLE_RADIUS * f;
			}

            let radius = touch.radius * viewport.getScale();

            if ( radius > ZERO )
            {
                let alpha = ONE - touch.radius / MAX_TOUCH_RIPPLE_RADIUS;
				let effectColor = pool.getEffectColor();
				effectColor.opacity = alpha;

                _canvas.lineWidth = lineWidth;
                _canvas.strokeStyle = effectColor.rgba();	
                _canvas.beginPath();
                _canvas.arc( touch.position.x, touch.position.y, radius, 0, PI2, false );
                _canvas.stroke();
                _canvas.closePath();	
			}
		}
	}

	//-----------------------------------------------------------------------
	// render obsticles
	//-----------------------------------------------------------------------
	this.renderObsticle = function( endPoint1, endPoint2, radius, color, camera )
	{
        //--------------------------------------------
        // main shaft (the 2D version is a line 'radius' wide)
        //--------------------------------------------
        let p1 = endPoint1.getPosition();
        let p2 = endPoint2.getPosition();
        let halfWidth = radius * ONE_HALF;
        glView.addStraightTube( p1.x, p1.y, p2.x, p2.y, halfWidth, halfWidth, ZERO, OBSTACLE_SQUASH, color, ZERO );

        //-----------------------
        // show ends
        //-----------------------
        renderObsticleEndpoint( endPoint1, camera.getScale() );
        renderObsticleEndpoint( endPoint2, camera.getScale() );
    }


	function renderObsticleEndpoint( endPoint, scale )
	{
        let radius   = endPoint.getEndRadius();
        let position = endPoint.getPosition();

        glView.addSphere( position.x, position.y, radius, ZERO, OBSTACLE_SQUASH, endPoint.getColor(), ZERO );

        if ( endPoint.getHovered() )
        {
            _canvas.lineWidth = 0.003 * scale; 	
			let hoverRadius = endPoint.getHoverRadius();
            _canvas.strokeStyle = "rgba(255, 255, 255, 0.4 )";
            _canvas.beginPath();
            _canvas.arc( position.x, position.y, hoverRadius, 0, PI2, false );
            _canvas.stroke();
            _canvas.closePath();	
        }
    }
}
