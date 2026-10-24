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

//const GRAPH_UPDATE_PERIOD = 50;


//------------------
function Graph()
{	
    const GRAPH_LEFT_MARGIN     = 20;
    const GRAPH_RIGHT_MARGIN    = 20;
    const GRAPH_BOTTOM_MARGIN   = 160;
    const GRAPH_TOP_MARGIN      = 40;
    const GRAPH_MAX_POPULATION  = 2000;
    const RECIPROCAL_OF_MAX_POP = 1 / GRAPH_MAX_POPULATION;
    const GRAPH_FOODBIT_COLOR   = "#5ee07a";
    const GRAPH_FOODBIT_1_COLOR = "#5aa9ff";
    const GRAPH_SWIMBOT_COLOR   = "#ff8a5b";
    const GRAPH_CARNIVORE_COLOR = "#ff4f8b";
    //const GRAPH_SWIMBOT_1_COLOR = "rgb( 200,  20, 200 )";


//let _maxPopulationValue = 0;
	let _currentCount   = 0;
	let _left	        = 0;
	let _top            = 0;
	let _right	        = 0;
	let _bottom	        = 0;
	let _width	        = 0;
	let _height	        = 0;
	let _maxGraphCount  = 0;
    let _level1000      = 0;
    let _level0500      = 0;
    let _level0000      = 0;
    let _graphLeft	    = 0;
    let _graphRight	    = 0;
    let _graphBottom	= 0;
    let _graphTop	    = 0;
    let _graphWidth	    = 0;
    let _graphHeight    = 0;
    let _maxValue       = 2000;
	let _time           = new Array(); 
	let _numSwimbots    = new Array(); 
	//let _numSwimbots1   = new Array(); 
	let _numFoodBits    = new Array(); 
    let _numFoodBits1   = new Array(); //kind of a hack - but I wanna get it working first....
    let _numCarnivores  = new Array();
 

	//---------------------------
	this.initialize = function()
	{	
        //console.log( "initialize graph!" );	
	
    	_currentCount = 0;
    	_maxGraphCount = 20;
    	
	    _time.length = 0;
	    _numSwimbots.length  = 0;
	    //_numSwimbots1.length = 0;
        _numFoodBits.length  = 0;
        _numFoodBits1.length = 0;
        _numCarnivores.length = 0;

	    _time = [];
	    _numSwimbots  = [];
	    //_numSwimbots1 = [];
        _numFoodBits  = [];
        _numFoodBits1 = [];
        _numCarnivores = [];
	}


	//---------------------------------------------------------------------
	this.update = function( time, numSwimbots, numFoodBits, numFoodBits1, numCarnivores )
	{	
        if ( _maxGraphCount	< 1000 )
        {
            _maxGraphCount ++;
        }	
	
        if ( _currentCount < _maxGraphCount )
        {
            _time		 [ _currentCount ] = time;
            _numSwimbots [ _currentCount ] = numSwimbots;
            //_numSwimbots1[ _currentCount ] = numSwimbots + 200;
            _numFoodBits [ _currentCount ] = numFoodBits;
            _numFoodBits1[ _currentCount ] = numFoodBits1;
            _numCarnivores[ _currentCount ] = numCarnivores;
        
            _currentCount ++;
        }
        else
        {
            _time		 [ _maxGraphCount ] = time;
            _numSwimbots [ _maxGraphCount ] = numSwimbots;
            //_numSwimbots1[ _maxGraphCount ] = numSwimbots + 200;
            _numFoodBits [ _maxGraphCount ] = numFoodBits;
            _numFoodBits1[ _maxGraphCount ] = numFoodBits1;
            _numCarnivores[ _maxGraphCount ] = numCarnivores;
        
            this.scroll();
        }
    } 


	//-----------------------
	this.scroll = function()
	{	
        for (let c=0; c<_maxGraphCount; c++)
        {
            _time		 [c] = _time	    [c+1];
            _numSwimbots [c] = _numSwimbots	[c+1];
            //_numSwimbots1[c] = _numSwimbots	[c+1];
            _numFoodBits [c] = _numFoodBits	[c+1];
            _numFoodBits1[c] = _numFoodBits1[c+1];
            _numCarnivores[c] = _numCarnivores[c+1];
        }
    }
    

	//------------------------
	this.clear = function()
	{	
        //console.log( "clear graph!" );	

        let graphCanvasID = document.getElementById( 'graphCanvas' );
        let graphCanvas   = graphCanvasID.getContext( '2d' );
    
        graphCanvas.clearRect( 0, 0, graphCanvasID.width, graphCanvasID.height );	    
	}
	
	
	//------------------------
	this.render = function()
	{	
        let graphCanvasID = document.getElementById( 'graphCanvas' );
        let graphCanvas   = graphCanvasID.getContext( '2d' );

        //---------------------------------------------------------
        // match the canvas resolution to its displayed size
        //---------------------------------------------------------
        let ratio  = window.devicePixelRatio || 1;
        let width  = graphCanvasID.clientWidth;
        let height = graphCanvasID.clientHeight;
        if ( width === 0 || height === 0 ) return;

        if ( graphCanvasID.width  !== Math.round( width  * ratio )
        ||   graphCanvasID.height !== Math.round( height * ratio ) )
        {
            graphCanvasID.width  = Math.round( width  * ratio );
            graphCanvasID.height = Math.round( height * ratio );
        }
        graphCanvas.setTransform( ratio, 0, 0, ratio, 0, 0 );
        graphCanvas.clearRect( 0, 0, width, height );

        _width  = width;
        _height = height;
        _graphLeft   = 40;
        _graphRight  = width  - 12;
        _graphTop    = 14;
        _graphBottom = height - 22;
        _graphWidth  = _graphRight  - _graphLeft;
        _graphHeight = _graphBottom - _graphTop;

        //---------------------------------------------------------
        // vertical scale: a round number above the largest value
        //---------------------------------------------------------
        let largest = 100;
        for (let g=0; g<_currentCount; g++)
        {
            largest = Math.max( largest, _numSwimbots[g], _numFoodBits[g], _numFoodBits1[g] || 0 );
        }
        let step = niceStep( largest / 4 );
        _maxValue = Math.ceil( largest * 1.1 / step ) * step;

        //---------------------------------------------------------
        // horizontal grid lines and labels
        //---------------------------------------------------------
        graphCanvas.font = "11px Inter, system-ui, sans-serif";
        graphCanvas.textAlign = "right";
        graphCanvas.textBaseline = "middle";
        graphCanvas.lineWidth = 1;

        for (let v=0; v<=_maxValue; v+=step)
        {
            let y = Math.round( valueToY( v ) ) + 0.5;
            graphCanvas.strokeStyle = ( v === 0 ) ? "rgba( 255, 255, 255, 0.25 )" : "rgba( 255, 255, 255, 0.07 )";
            graphCanvas.beginPath();
            graphCanvas.moveTo( _graphLeft,  y );
            graphCanvas.lineTo( _graphRight, y );
            graphCanvas.stroke();

            graphCanvas.fillStyle = "rgba( 180, 195, 214, 0.7 )";
            graphCanvas.fillText( v.toString(), _graphLeft - 8, y );
        }

        //---------------------------------------------------------
        // time labels
        //---------------------------------------------------------
        if ( _currentCount > 1 )
        {
            graphCanvas.textBaseline = "alphabetic";
            graphCanvas.textAlign = "left";
            graphCanvas.fillText( _time[0].toString(), _graphLeft, height - 6 );
            graphCanvas.textAlign = "right";
            graphCanvas.fillText( _time[ _currentCount - 1 ].toString(), _graphRight, height - 6 );
            graphCanvas.textAlign = "center";
            graphCanvas.fillText( "time step", _graphLeft + _graphWidth * 0.5, height - 6 );
        }

        //-------------------------------
        // render the actual graph
        //-------------------------------
        this.renderPopulationLines( graphCanvas );
    }

	//---------------------------------------
	this.renderPopulationLines = function( graphCanvas )
	{	
        if ( _currentCount < 2 ) return;

        graphCanvas.lineWidth = 1.8; 
        graphCanvas.lineJoin  = "round";

        let series = [ [ _numFoodBits, GRAPH_FOODBIT_COLOR ], [ _numFoodBits1, GRAPH_FOODBIT_1_COLOR ], [ _numSwimbots, GRAPH_SWIMBOT_COLOR ], [ _numCarnivores, GRAPH_CARNIVORE_COLOR ] ];

        for (let s=0; s<series.length; s++)
        {
            let values = series[s][0];
            graphCanvas.strokeStyle = series[s][1];
            graphCanvas.beginPath();

            for (let g=0; g<_currentCount; g++ )
            {
                let x = _graphLeft + ( g / ( _maxGraphCount ) ) * _graphWidth;
                let y = valueToY( values[g] || 0 );
                if ( g === 0 ) { graphCanvas.moveTo( x, y ); }
                else           { graphCanvas.lineTo( x, y ); }
            }
            graphCanvas.stroke();
        }
    }

    //---------------------------------------
    function valueToY( value )
    {
        return _graphBottom - ( value / _maxValue ) * _graphHeight;
    }

    //---------------------------------------
    // 1, 2, 5 x 10^n step closest above 'rough'
    //---------------------------------------
    function niceStep( rough )
    {
        let power = Math.pow( 10, Math.floor( Math.log10( rough ) ) );
        let f = rough / power;
        return ( f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10 ) * power;
    }
}				
				
				
		