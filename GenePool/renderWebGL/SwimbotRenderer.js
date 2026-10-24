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

function SwimbotRenderer( glView )
{
	let _canvas = null;		// the 2D overlay, set during initialization

    //---------------------------------
    //  colors 
    //---------------------------------
    const OUTLINE_COLOR     = "rgba( 0, 0, 0, 0.4 )";	
    
    //---------------------------------
    //  spline 
    //---------------------------------
    const DEFAULT_SPLINE_FACTOR = 0.4;

    //---------------------------------
    //  egg size 
    //---------------------------------
    const EGG_SIZE = 5.0;

    //---------------------------------
    //  3D shape
    //---------------------------------
    const BODY_SQUASH       = 0.75;     // body height relative to width
    const DOT_SQUASH        = 0.6;
    const JOINT_SCALE       = 0.9;      // joint balls (matches the 2D renderer)
    const END_CAP_EXTENT    = 0.75;     // how far a Bezier end cap bulges relative to its control length
    const MIN_END_CAP       = 0.15;     // (relative to width) so flat caps still have some roundness
    const NUM_LAYERS        = 16;       // swimbots get slightly different heights to avoid z-fighting
    const LAYER_SPACING     = 0.15;

	//	for debug trails
    const TRAIL_LENGTH = 100;

	//--------------------------------
	// variables from swimbot
	//--------------------------------
	let _phenotype      = new Phenotype(); 
	let _growthScale    = ZERO;
	let _focusDirection = new Vector2D();
	let _brain          = new Brain();
	let _age            = 1000;
	let _energy         = ZERO;
	let _parentPosition = new Vector2D();

	//--------------------------------
	// local variables
	//--------------------------------
	let _colorUtility   = new Color( ZERO, ZERO, ZERO, ONE );
	let _splineFactor   = ZERO;
	let _layer          = ZERO;
	let _renderingGenitalsAndMouths = false;
	let _debugTrail     = new Array( TRAIL_LENGTH ); 

	//-------------------------------------------
	// set rendering goals
	//-------------------------------------------
	this.setRenderingGoals = function( r )
	{	
	    _renderingGenitalsAndMouths = r;
    }

	//-------------------------------------
	// initialize - one time setup
	//-------------------------------------
	this.initialize = function( canvas )
	{
		_canvas = canvas;

		//-------------------------------------
		// create trail array
		//-------------------------------------
		for (let t=0; t<TRAIL_LENGTH; t++)
		{
			_debugTrail[t] = new Vector2D(); 
		}	
	}

	//------------------------------------------------
	//	dispose of render assets for a given swimmer
	//------------------------------------------------
	this.releaseRenderAssets = function( swimmer ) {
		//	swimbots are drawn as instances - no per-swimbot assets
	}

	//-----------------------
	// render
	//-----------------------
	this.render = function( swimbot, levelOfDetail )
	{
    	_phenotype      = swimbot.getPhenotype();
    	_brain          = swimbot.getBrain();
    	_age            = swimbot.getAge();
    	_energy         = swimbot.getEnergy();
    	_growthScale    = swimbot.getGrowthScale();
    	_focusDirection = swimbot.getFocusDirection();
    	_layer          = ( swimbot.getIndex() % NUM_LAYERS ) * LAYER_SPACING;
        
		if ( levelOfDetail == SWIMBOT_LEVEL_OF_DETAIL_DOT )
		{
		    let p = 1;
            _colorUtility = swimbot.calculatePartColor( p );
            let position = _phenotype.parts[p].position;
            glView.addSphere( position.x, position.y, SWIMBOT_DOT_RENDER_RADIUS, _layer, DOT_SQUASH, _colorUtility, ZERO );
        }
		else if ( levelOfDetail == SWIMBOT_LEVEL_OF_DETAIL_LOW )
		{
			for (let p=1; p<_phenotype.numParts; p++)
			{
				_parentPosition = swimbot.getPartParentPosition(p);
				_colorUtility = swimbot.calculatePartColor( p );

				let position = _phenotype.parts[p].position;
				let width    = _phenotype.parts[p].width;
				glView.addStraightTube( _parentPosition.x, _parentPosition.y, position.x, position.y, width, width, _layer, BODY_SQUASH, _colorUtility, ZERO );
			}	
		}
		else if ( levelOfDetail == SWIMBOT_LEVEL_OF_DETAIL_HIGH )
		{ 
			glView.setHighDetail();

			for (let p=1; p<_phenotype.numParts; p++)
			{
				_parentPosition = swimbot.getPartParentPosition(p);
				_colorUtility = swimbot.calculatePartColor( p );

				if ( _phenotype.parts[p].length > ZERO )
				{
                    //--------------------------------------------
                    // render the part
                    //--------------------------------------------
                    _splineFactor = DEFAULT_SPLINE_FACTOR; 	

                    if ( _phenotype.parts[p].splined )
                    {
                        this.renderPartSplined(p);
                    }
                    else
                    {
                        this.renderPartNormal(p);
                    }

                    //--------------------------------------------
                    // if p is mouth part, render mouth!
                    //--------------------------------------------
                    if ( p === 1 )
                    {
                        if ( _renderingGenitalsAndMouths )
                        {
                            if (( _brain.getState() == BRAIN_STATE_LOOKING_FOR_FOOD	)
                            ||  ( _brain.getState() == BRAIN_STATE_PURSUING_FOOD )
                            ||  ( _brain.getState() == BRAIN_STATE_PURSUING_PREY ))
                            {	
								_colorUtility = swimbot.calculatePartColor(1);  
                                this.renderMouth();
                            }		
                        }
                    }			
				}
			}
		}
		
        if ( _renderingGenitalsAndMouths )
		{
            //--------------------------------------------
            // render genital!
            //--------------------------------------------
            if (( _brain.getState() == BRAIN_STATE_LOOKING_FOR_MATE	)
            ||  ( _brain.getState() == BRAIN_STATE_PURSUING_MATE ))
            {	
                this.renderGenital();
            }
        }

	}// render funtion


	//------------------------------------------------------
	// render part normal (not splined): a capsule
	//------------------------------------------------------
	this.renderPartNormal = function(p)
	{			
        let width     = _phenotype.parts[p].width;
        let position  = _phenotype.parts[p].position;
        
        //---------------------------
        // baby growing...
        //---------------------------
        if ( _growthScale < ONE )        
        {
            width = width * _growthScale + EGG_SIZE * ( ONE - _growthScale );
        }

        glView.addStraightTube( _parentPosition.x, _parentPosition.y, position.x, position.y, width, width, _layer, BODY_SQUASH, _colorUtility, ZERO );
        glView.addSphere( position.x,        position.y,        width, _layer, BODY_SQUASH, _colorUtility, ZERO );
        glView.addSphere( _parentPosition.x, _parentPosition.y, width, _layer, BODY_SQUASH, _colorUtility, ZERO );
    }


	//----------------------------------------------------------------------
	// render part splined: same Bezier construction as the 2D renderer
	//----------------------------------------------------------------------
	this.renderPartSplined = function(p)
	{
	    let parentIndex     = _phenotype.parts[p].parent;
        let position 		= _phenotype.parts[p].position;
        let width           = _phenotype.parts[p].width;
        let parentWidth     = _phenotype.parts[ parentIndex ].width;

        //---------------------------
        // baby growing...
        //---------------------------
        if ( _growthScale < ONE )        
        {
            width       = width         * _growthScale + EGG_SIZE * ( ONE - _growthScale );
            parentWidth = parentWidth   * _growthScale + EGG_SIZE * ( ONE - _growthScale );
        }

        let perpStartX  = _phenotype.parts[p].perpendicular.x;
        let perpStartY  = _phenotype.parts[p].perpendicular.y;
        let perpEndX    = _phenotype.parts[p].perpendicular.x;
        let perpEndY    = _phenotype.parts[p].perpendicular.y;

        let controlVectorLength = _phenotype.parts[p].length * _splineFactor;

        //-------------------------------------------------------------------------------
        // blend the two perpendiculars to represent the perpendicular of the joint
        //-------------------------------------------------------------------------------
        if (( p > 1 ) && ( ! _phenotype.parts[p].branch ))
        {
            perpStartX += _phenotype.parts[ parentIndex ].perpendicular.x;
            perpStartY += _phenotype.parts[ parentIndex ].perpendicular.y;
    
            let length = Math.sqrt( perpStartX * perpStartX + perpStartY * perpStartY );
            if ( length > ZERO )
            {
                perpStartX /= length;
                perpStartY /= length;
            }
        }

        if ( _phenotype.parts[p].child != NULL_INDEX )
        {
            perpEndX += _phenotype.parts[ _phenotype.parts[p].child ].perpendicular.x;
            perpEndY += _phenotype.parts[ _phenotype.parts[p].child ].perpendicular.y;

            let length = Math.sqrt( perpEndX * perpEndX + perpEndY * perpEndY );
            if ( length > ZERO )
            {
                perpEndX /= length;
                perpEndY /= length;
            }
        }

        //--------------------------------------
        // the two control vectors
        //--------------------------------------
        let control1VectorX = -perpStartY * controlVectorLength;
        let control1VectorY =  perpStartX * controlVectorLength;
        let control2VectorX =  perpEndY   * controlVectorLength;
        let control2VectorY = -perpEndX   * controlVectorLength;

        let startWidth = ( p === 1 ) ? width : parentWidth;

        glView.addTube
        ( 
            _parentPosition.x, _parentPosition.y, position.x, position.y,
            control1VectorX, control1VectorY, control2VectorX, control2VectorY,
            startWidth, width, _layer, BODY_SQUASH, _colorUtility, ZERO
        );

        //---------------------------------------
        // the beginning of a series of parts
        //---------------------------------------
        if ( p === 1 )
        {
            let root = _phenotype.parts[ parentIndex ].position;
            glView.addSphere( root.x, root.y, width, _layer, BODY_SQUASH, _colorUtility, ZERO );
        }

        //---------------------------------------
        // joint
        //---------------------------------------
        glView.addSphere( _parentPosition.x, _parentPosition.y, parentWidth * JOINT_SCALE, _layer, BODY_SQUASH, _colorUtility, ZERO );

        //---------------------------------------
        // a terminating end part gets a cap
        //---------------------------------------
        if ( _phenotype.parts[p].child === NULL_INDEX )
        {        
            let axisNormalX = _phenotype.parts[p].axis.x / _phenotype.parts[p].length;
            let axisNormalY = _phenotype.parts[p].axis.y / _phenotype.parts[p].length;
            let capLength = Math.max( width * _phenotype.parts[p].endCapSpline * END_CAP_EXTENT, width * MIN_END_CAP );

            glView.addEllipsoid( position.x, position.y, axisNormalX, axisNormalY, capLength, width, _layer, BODY_SQUASH, _colorUtility, ZERO );
        }
    }

    
	//--------------------------------
	// render genital
	//--------------------------------
	this.renderGenital = function()
	{	
        let genitalLength = SWIMBOT_GENITAL_LENGTH * _growthScale;
        
        let x = _phenotype.parts[ GENITAL_INDEX ].position.x + _focusDirection.x * genitalLength;
        let y = _phenotype.parts[ GENITAL_INDEX ].position.y + _focusDirection.y * genitalLength;
        
		_canvas.lineWidth = 1.0; 
        _canvas.strokeStyle = "rgba( 255, 255, 255, 0.7 )";	
        _canvas.beginPath();
        _canvas.moveTo( _phenotype.parts[ GENITAL_INDEX ].position.x, _phenotype.parts[ GENITAL_INDEX ].position.y );
        _canvas.lineTo( x, y );
        _canvas.stroke();
        _canvas.closePath();			
        
        //--------------------------------------------------------
        // if pursuing a mate, show arrow head
        //--------------------------------------------------------
        if ( _brain.getState() === BRAIN_STATE_PURSUING_MATE )
        {
            let arrowLength = genitalLength * 0.4;
            let arrowWidth  = genitalLength * 0.25;
            let xLeft  = x - _focusDirection.y * arrowWidth - _focusDirection.x * arrowLength;
            let yLeft  = y + _focusDirection.x * arrowWidth - _focusDirection.y * arrowLength;

            let xRight = x + _focusDirection.y * arrowWidth - _focusDirection.x * arrowLength;
            let yRight = y - _focusDirection.x * arrowWidth - _focusDirection.y * arrowLength;
            
            _canvas.beginPath();
            _canvas.lineTo( x, y );
            _canvas.lineTo( xRight, yRight );
            _canvas.stroke();
            _canvas.closePath();			
        }
	}





	//--------------------------------
	// render mouth
	//--------------------------------
	this.renderMouth = function()
	{		    
// older version	
/*
let mouthLength = SWIMBOT_MOUTH_LENGTH * _growthScale;
let mouthEndX = _phenotype.parts[ MOUTH_INDEX ].position.x + _focusDirection.x * mouthLength;
let mouthEndY = _phenotype.parts[ MOUTH_INDEX ].position.y + _focusDirection.y * mouthLength;

_canvas.lineWidth = SWIMBOT_MOUTH_WIDTH; 
_canvas.strokeStyle = "rgb( 50, 200, 50 )";	

//--------------------------------------------------------
// if pursuing a food bit, show jaws
//--------------------------------------------------------
if ( _brain.getState() === BRAIN_STATE_PURSUING_FOOD )
{
    let px = _focusDirection.y * mouthLength * 0.4;
    let py = _focusDirection.x * mouthLength * 0.4;
    let fx = _focusDirection.x * mouthLength * 0.6;
    let fy = _focusDirection.y * mouthLength * 0.6;
    
    let leftJawX  = mouthEndX - px + fx;
    let leftJawY  = mouthEndY + py + fy;
    let rightJawX = mouthEndX + px + fx;
    let rightJawY = mouthEndY - py + fy;

    _canvas.beginPath();            
    _canvas.moveTo( leftJawX,  leftJawY  );
    _canvas.lineTo( _phenotype.parts[ MOUTH_INDEX ].position.x, _phenotype.parts[ MOUTH_INDEX ].position.y );
    _canvas.lineTo( rightJawX, rightJawY );
    _canvas.stroke();
    _canvas.closePath();		
}
else
{
    _canvas.beginPath();
    _canvas.moveTo( _phenotype.parts[ MOUTH_INDEX ].position.x, _phenotype.parts[ MOUTH_INDEX ].position.y );
    _canvas.lineTo( mouthEndX, mouthEndY );
    _canvas.stroke();
    _canvas.closePath();						
}	
*/        
        // new version
        
	    let mouthLength = _phenotype.parts[1].width * 2.5;
	    if ( mouthLength < SWIMBOT_MIN_MOUTH_LENGTH )
	    {
	        mouthLength = SWIMBOT_MIN_MOUTH_LENGTH;
	    }
	    	    
	    let mouthWidth = _phenotype.parts[1].width;
	    if ( mouthWidth < SWIMBOT_MIN_MOUTH_WIDTH )
	    {
	        mouthWidth = SWIMBOT_MIN_MOUTH_WIDTH;
	    }
	    
	    mouthLength *= _growthScale;
	    mouthWidth  *= _growthScale;
	    
	    let baseX = _phenotype.parts[ MOUTH_INDEX ].position.x;
	    let baseY = _phenotype.parts[ MOUTH_INDEX ].position.y;

        let mouthStartX = baseX + _focusDirection.x * mouthLength * 0.3;
        let mouthStartY = baseY + _focusDirection.y * mouthLength * 0.3;

        let mouthEndX = baseX + _focusDirection.x * mouthLength;
        let mouthEndY = baseY + _focusDirection.y * mouthLength;
        
        let basePerpX =  _focusDirection.y * _phenotype.parts[1].width * 0.5;
        let basePerpY = -_focusDirection.x * _phenotype.parts[1].width * 0.5;

        let endPerpX  =  _focusDirection.y * mouthWidth;
        let endPerpY  = -_focusDirection.x * mouthWidth;
        
        let leftJawX  = baseX - basePerpX;
        let leftJawY  = baseY - basePerpY;
        let rightJawX = baseX + basePerpX;
        let rightJawY = baseY + basePerpY;
        
        let leftEndX  = mouthEndX;
        let leftEndY  = mouthEndY;
        let rightEndX = mouthEndX;
        let rightEndY = mouthEndY;
            
		_canvas.lineWidth = SWIMBOT_MOUTH_WIDTH; 
        _canvas.fillStyle = _colorUtility.rgba();	
        
        //--------------------------------------------------------
        // open jaws
        //--------------------------------------------------------
        if (( _brain.getState() === BRAIN_STATE_PURSUING_FOOD )
        ||  ( _brain.getState() === BRAIN_STATE_PURSUING_PREY ))
        {
            leftEndX  -= endPerpX;
            leftEndY  -= endPerpY;
            rightEndX += endPerpX;
            rightEndY += endPerpY;
        }        

        _canvas.beginPath();
        _canvas.moveTo( mouthStartX, mouthStartY );
        _canvas.lineTo( leftJawX,    leftJawY    );
        _canvas.lineTo( leftEndX,    leftEndY    );
        _canvas.lineTo( mouthStartX, mouthStartY );
        _canvas.lineTo( rightEndX,   rightEndY   );
        _canvas.lineTo( rightJawX,   rightJawY   );
        _canvas.lineTo( leftJawX,    leftJawY    );
        _canvas.fill();
        _canvas.closePath();	
        
        _canvas.strokeStyle = "rgba( 255, 255, 255, 0.7 )";	
        _canvas.beginPath();
        _canvas.moveTo( rightEndX,   rightEndY  );
        _canvas.lineTo( mouthStartX, mouthStartY );
        _canvas.lineTo( leftEndX,    leftEndY );
        _canvas.stroke();
        _canvas.closePath();	     
               					
        _canvas.strokeStyle = OUTLINE_COLOR; 
        _canvas.beginPath();
        _canvas.moveTo( leftJawX, leftJawY );
        _canvas.lineTo( leftEndX, leftEndY );
        _canvas.stroke();
        _canvas.closePath();	            					

        _canvas.beginPath();
        _canvas.moveTo( rightJawX, rightJawY );
        _canvas.lineTo( rightEndX, rightEndY );
        _canvas.stroke();
        _canvas.closePath();	 
                   					
    }
    

	//--------------------------------------
	//	Trails!
	//--------------------------------------
	this.initializeDebugTrail = function( position )
	{
        for (let t=0; t<TRAIL_LENGTH; t++)
        {
            _debugTrail[t].set( position );
        }	
    }

	//-----------------------------------
	this.showSwimbotTrail = function( position, clock )
	{
        //------------------------------------
        // update trail
        //------------------------------------
        if ( clock % 5 == 0 )
        {
            for (let t=TRAIL_LENGTH-1; t>0; t--)
            {
                _debugTrail[t].set( _debugTrail[t-1] ); 
            }	

           _debugTrail[0].set( position ); 
        }

        //------------------------------------
        // render trail
        //------------------------------------
        _canvas.lineWidth = 2; 
        _canvas.strokeStyle = "rgb( 255, 255, 255 )";

        for (let t=1; t<TRAIL_LENGTH; t++)
        {
            _canvas.beginPath();
            _canvas.moveTo( _debugTrail[t-1].x, _debugTrail[t-1].y );
            _canvas.lineTo( _debugTrail[t].x, _debugTrail[t].y );
            _canvas.closePath();
            _canvas.stroke();
        }	
	}

}//end of entire Swimbots function -------------------------
