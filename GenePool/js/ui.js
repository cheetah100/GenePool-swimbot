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


//--------------------------
const FIRST_INFO_PAGE = 1;
const LAST_INFO_PAGE  = 28;

//	view tracking modes and the buttons that show them
const VIEW_MODE_BUTTONS = 
[
    [ 'viewWholePoolButton', 'WHOLE_POOL' ],
    [ 'viewAutoTrackButton', 'AUTOTRACK'  ],
    [ 'viewSelectedButton',  'SELECTED'   ],
    [ 'viewMutualButton',    'MUTUAL'     ],
    [ 'viewProlificButton',  'PROLIFIC'   ],
    [ 'viewEfficientButton', 'EFFICIENT'  ],
    [ 'viewVirginButton',    'VIRGIN'     ],
    [ 'viewGluttonButton',   'HUNGRY'     ]
];

const MENU_PANELS = 
{
    menuPoolButton    : 'poolPanel',
    menuSwimbotButton : 'swimbotPanel',
    menuTweakButton   : 'tweakPanel',
    menuGraphButton   : 'graphPanel',
    menuInfoButton    : 'infoPanel'
};

//	colors used by the graph legend (match graph.js)
const LEGEND_SWIMBOT_COLOR  = "#ff8a5b";
const LEGEND_FOODBIT_COLOR  = "#5ee07a";
const LEGEND_FOODBIT1_COLOR = "#5aa9ff";

const UI_UPDATE_PERIOD = 500;


let _currentInfoPage            = FIRST_INFO_PAGE;
let _graph                      = new Graph(); 
let _tweakGenesCategory         = 0;
let _runningFast                = false;

//-----------------------------------------------------------------
// show/hide and highlight elements with CSS classes (see genepool.css)
//-----------------------------------------------------------------
function setShown( id, shown )
{
    document.getElementById( id ).classList.toggle( 'hidden', ! shown );
}

function isShown( id )
{
    return ! document.getElementById( id ).classList.contains( 'hidden' );
}

function setActive( id, active )
{
    document.getElementById( id ).classList.toggle( 'active', active );
}

//----------------------------
function initializeUI()
{
    initializeEcosystemUI();    
	enableControlPanel(true);
    
    _graph.initialize();      
  
    //--------------------------------------------------
    // This starts an update loop that is called 
    // periodically to adjust UI states and stuff. 
    //--------------------------------------------------
    //console.log( "setTimeout" );
        
    setTimeout( "updateUI()", 1 );
 }


function enableControlPanel( state )
{
	setShown( 'masterPanel', state );
	resize();
}


//----------------------------
function chooseAttraction()
{
    //console.log( "chooseAttraction" );

    let radioButtons = document.getElementsByName( 'attractionRadioButton' );

    /*
    console.log( "radioButtons.length = " + radioButtons.length );

    for (let i = 0; i < radioButtons.length; i++) 
    {
        console.log( radioButtons[i].value );
    }
    */
    
    for (let i = 0; i < radioButtons.length; i++) 
    {
        if ( radioButtons[i].type === 'radio' ) 
        {
            //console.log( "if ( radioButtons[i].type === 'radio' ) " );

            if ( radioButtons[i].checked )
            {
                let value = radioButtons[i].value;  
                let attraction = ATTRACTION_SIMILAR_COLOR;

                     if ( value === "colorful"          ) { attraction = ATTRACTION_COLORFUL;           }
                else if ( value === "big"               ) { attraction = ATTRACTION_BIG;                }
                else if ( value === "hyper"             ) { attraction = ATTRACTION_HYPER;              }
                else if ( value === "long"              ) { attraction = ATTRACTION_LONG;               }
                else if ( value === "straight"          ) { attraction = ATTRACTION_STRAIGHT;           }
                
                else if ( value === "noColor"           ) { attraction = ATTRACTION_NO_COLOR;           }
                else if ( value === "small"             ) { attraction = ATTRACTION_SMALL;              }
                else if ( value === "still"             ) { attraction = ATTRACTION_STILL;              }
                else if ( value === "short"             ) { attraction = ATTRACTION_SHORT;              }
                else if ( value === "crooked"           ) { attraction = ATTRACTION_CROOKED;            }
                
                else if ( value === "similarColor"      ) { attraction = ATTRACTION_SIMILAR_COLOR;      }
                else if ( value === "similarSize"       ) { attraction = ATTRACTION_SIMILAR_SIZE;       }
                else if ( value === "similarHyper"      ) { attraction = ATTRACTION_SIMILAR_HYPER;      }
                else if ( value === "similarLength"     ) { attraction = ATTRACTION_SIMILAR_LENGTH;     }
                else if ( value === "similarStraight"   ) { attraction = ATTRACTION_SIMILAR_STRAIGHT;   }
                
                else if ( value === "random"            ) { attraction = ATTRACTION_RANDOM;             }
                else if ( value === "closest"           ) { attraction = ATTRACTION_CLOSEST;            }
            
                //console.log ( "Attraction set to " + attraction );
                genePool.setAttraction( attraction );
            }
        }
    }
}


//-------------------------
function openTweakPanel()
{
    setShown( 'tweakPanel', true );
    updateEcosystemUI();
}    



//--------------------------------
function setEcosystemValue( id )
{
    let input = document.getElementById( id );
    
         if ( id === "foodGrowthDelaySlider"    ) { genePool.setFoodGrowthDelay     ( input.value ); }
    else if ( id === "foodSpreadSlider"         ) { genePool.setFoodSpread          ( input.value ); }
    else if ( id === "foodBitEnergySlider"      ) { genePool.setFoodBitEnergy       ( input.value ); }
    else if ( id === "hungerThresholdSlider"    ) { genePool.setHungerThreshold     ( input.value ); }
    else if ( id === "energyToOffspringSlider"  ) { genePool.setOffspringEnergyRatio( input.value ); }
    else if ( id === "maxAgeSlider"             ) { genePool.setMaximumSwimbotAge   ( input.value ); }
        
    updateEcosystemUI(); 
}

//------------------------------------
function setEcosystemToDefaults()
{   
    genePool.setFoodGrowthDelay     ( DEFAULT_FOOD_REGENERATION_PERIOD  );
    genePool.setFoodSpread          ( DEFAULT_FOOD_BIT_MAX_SPAWN_RADIUS );
    genePool.setFoodBitEnergy       ( DEFAULT_FOOD_BIT_ENERGY           );
    genePool.setHungerThreshold     ( DEFAULT_SWIMBOT_HUNGER_THRESHOLD  );
    genePool.setOffspringEnergyRatio( DEFAULT_CHILD_ENERGY_RATIO        );
    genePool.setMaximumSwimbotAge   ( DEFAULT_MAXIMUM_LIFESPAN          );
    
    updateEcosystemUI(); 
}



//----------------------------
function initializeEcosystemUI()
{
    document.getElementById( 'foodGrowthDelaySlider'    ).min = MIN_FOOD_REGENERATION_PERIOD;
    document.getElementById( 'foodGrowthDelaySlider'    ).max = MAX_FOOD_REGENERATION_PERIOD;

    document.getElementById( 'foodSpreadSlider'         ).min = MIN_FOOD_BIT_MAX_SPAWN_RADIUS;
    document.getElementById( 'foodSpreadSlider'         ).max = MAX_FOOD_BIT_MAX_SPAWN_RADIUS;

    document.getElementById( 'foodBitEnergySlider'      ).min = MIN_FOOD_BIT_ENERGY;
    document.getElementById( 'foodBitEnergySlider'      ).max = MAX_FOOD_BIT_ENERGY;
    
    document.getElementById( 'hungerThresholdSlider'    ).min = MIN_SWIMBOT_HUNGER_THRESHOLD;
    document.getElementById( 'hungerThresholdSlider'    ).max = MAX_SWIMBOT_HUNGER_THRESHOLD;
        
    document.getElementById( 'energyToOffspringSlider'  ).min = MIN_CHILD_ENERGY_RATIO;
    document.getElementById( 'energyToOffspringSlider'  ).max = MAX_CHILD_ENERGY_RATIO;
    
    document.getElementById( 'maxAgeSlider'             ).min = MIN_MAXIMUM_AGE;
    document.getElementById( 'maxAgeSlider'             ).max = MAX_MAXIMUM_AGE;
    
    updateEcosystemUI();
}
    


//----------------------------
function updateEcosystemUI()
{
    if ( typeof genePool != "undefined" ) 
    {    
        document.getElementById( "foodGrowthDelaySlider"    ).value     = genePool.getFoodGrowthDelay();
        document.getElementById( "foodGrowthDelayValue"     ).innerHTML = genePool.getFoodGrowthDelay();        
    
        document.getElementById( "foodSpreadSlider"         ).value     = genePool.getFoodSpread();
        document.getElementById( "foodSpreadValue"          ).innerHTML = genePool.getFoodSpread();

        document.getElementById( "foodBitEnergySlider"      ).value     = genePool.getFoodBitEnergy();
        document.getElementById( "foodBitEnergyValue"       ).innerHTML = genePool.getFoodBitEnergy();
    
        document.getElementById( "hungerThresholdSlider"    ).value     = genePool.getHungerThreshold();
        document.getElementById( "hungerThresholdValue"     ).innerHTML = genePool.getHungerThreshold();

        document.getElementById( "energyToOffspringSlider"  ).value     = genePool.getEnergyToOffspring();
        document.getElementById( "energyToOffspringValue"   ).innerHTML = genePool.getEnergyToOffspring();   

        document.getElementById( "maxAgeSlider"             ).value     = genePool.getMaximumSwimbotAge();
        document.getElementById( "maxAgeValue"              ).innerHTML = genePool.getMaximumSwimbotAge();   
        
    
        //--------------------------------------------------------------------------    
        // the radio buttons need to be reset to reflect any changes in attraction    
        //--------------------------------------------------------------------------    
        let radioButtons = document.getElementsByName( 'attractionRadioButton' );
        //console.log ( "updateEcosystemUI: genePool.getAttraction() = " + genePool.getAttraction() );
    
        for (let i = 0; i < radioButtons.length; i++) 
        {
            assert( i < NUM_ATTRACTIONS, "ui.js: updateEcosystemUI: i < NUM_ATTRACTIONS" );
        
            if ( radioButtons[i].type === 'radio' ) 
            {
                if ( genePool.getAttraction() === i )
                {
                    radioButtons[i].checked = true;
                }
                else
                {
                    radioButtons[i].checked = false;
                }
            }
        }
    } 
}




//----------------------------
function closeAllPanels()
{
    for ( const buttonID in MENU_PANELS )
    {
        setShown ( MENU_PANELS[ buttonID ], false );
        setActive( buttonID, false );
    }

    closePopupPanel();		        
                    
    _graph.clear();        	        
}


//----------------------------
function openPanel( buttonID )
{
    closeAllPanels(); 
    
    if ( buttonID === 'menuPoolButton'      ) { openPoolPanel();    }
    if ( buttonID === 'menuSwimbotButton'   ) { openSwimbotPanel(); }
    if ( buttonID === 'menuTweakButton'     ) { openTweakPanel();   }
    if ( buttonID === 'menuInfoButton'      ) { openInfoPanel();    }
    if ( buttonID === 'menuGraphButton'     ) { openGraphPanel();   }

    setActive( buttonID, true );
}


//--------------------------
function openPoolPanel()
{
    setShown( 'poolPanel', true );
}

//--------------------------
function openGraphPanel()
{
    setShown( 'graphPanel', true );
    updateGraphPanel();
}

//--------------------------
function openSwimbotPanel()
{
    setShown( 'swimbotPanel', true );
    updateSwimbotPanel();
}    


//------------------------------------------------
function openTweakGenesPanel( selectedSwimbotID )
{
    if ( selectedSwimbotID != NULL_INDEX )
    {
        setShown( 'tweakGenesModal', true );

        let html = "<div class = 'gene-title'>Tweak the genes of swimbot " + selectedSwimbotID + "</div>"
                 + "<div class = 'gene-note'>Choose which limb type to tweak:</div>"
                 + "<div class = 'gene-categories'>";

        let numCategories = genePool.getNumGeneCategories();        
        for (let c=0; c<numCategories; c++)
        {
            html += "<label class = 'radio-chip'>"
                 +  "<input type = 'radio' id = 'geneTweakerCategory" + c + "' name = 'geneTweakerCategory' "
                 +  "onchange = 'setGeneTweakCategory( " + selectedSwimbotID + ", " + c + ")'>"
                 +  "<span>limb " + (c+1) + "</span></label>";
        }
        html += "</div><div class = 'gene-list'>";
        
        let num = genePool.getNumGenesPerCategory();
        num += 2; //add the two first (global: non-category) genes
        
        for (let g=0; g<num; g++)
        {
            let geneTweakerName  = genePool.getGeneName(g);
            let geneTweakerValue = genePool.getGeneValue( selectedSwimbotID, g );

            //	the first two genes are global; the rest belong to the chosen limb type
            if ( g === 2 )
            {
                html += "<div class = 'gene-divider'></div>";
            }
            
            html += "<label class = 'gene-row' for = 'geneTweaker" + g + "'>"
                 +  "<span class = 'geneTweakerName' title = '" + geneTweakerName + "'>" + geneTweakerName + "</span>"
                 +  "<input type = 'range' class = 'geneTweakerSlider' min = '0' max = '255' step = '1' autocomplete = 'off' "
                 +  "value = '" + geneTweakerValue + "' id = 'geneTweaker" + g + "' name = 'geneTweaker' "
                 +  "oninput = 'tweakGene( " + selectedSwimbotID + ", " + g + ")'>"
                 +  "<span class = 'geneTweakerValue' id = 'gene" + g + "Value'>" + geneTweakerValue + "</span>"
                 +  "</label>";
        }
        html += "</div>";

        document.getElementById( 'tweakGenesPanel' ).innerHTML = html;

        //----------------------------------------------------
        // initialize tweak category
        //----------------------------------------------------
        _tweakGenesCategory = 0;

        let radioButtons = document.getElementsByName( 'geneTweakerCategory' );
        for (let i = 0; i < radioButtons.length; i++) 
        {
            radioButtons[i].checked = ( i === _tweakGenesCategory );
        }    
    }
    else
    {
        closeTweakGenesPanel();
    }    
}


//----------------------------
function closeTweakGenesPanel()
{
    setShown( 'tweakGenesModal', false );
}


//---------------------------------------------
function updateGeneSliders( selectedSwimbotID )
{
    let num = genePool.getNumGenesPerCategory();
    num += 2; //add the two first (global: non-category) genes
    
    for (let g=0; g<num; g++)
    {
        let geneIndex = g;
    
        if ( g > 1 )
        {
            geneIndex += genePool.getNumGenesPerCategory() * _tweakGenesCategory;   
        }
    
        let geneTweakerValue = genePool.getGeneValue( selectedSwimbotID, geneIndex );
        
        let id = "geneTweaker" + g;
        let slider = document.getElementById( id );
        slider.value = geneTweakerValue;

        id = "gene" + g + "Value";
        document.getElementById( id ).innerHTML = geneTweakerValue;
    }
}


//-------------------------
function closePopupPanel()
{
    setShown( 'popUpModal', false );
    
    //---------------------------------------------------------------------   
    // move focus to the canvas in case it had been on the popup input  
    //---------------------------------------------------------------------   
    document.getElementById( "Canvas" ).focus();     
}


//-------------------------
function closeAccountPanel()
{
    document.getElementById( 'cancelAccountPanelButton' ).style.visibility = "hidden";    
    document.getElementById( 'accountPanel'             ).style.visibility = "hidden";  
    document.getElementById( 'accountEmailInput'        ).style.visibility = "hidden";
    document.getElementById( 'accountPasswordInput'     ).style.visibility = "hidden";
    document.getElementById( 'submitAccountButton'      ).style.visibility = 'hidden';
    
    document.getElementById( 'accountButton'    ).style.visibility = "visible";      
    document.getElementById( 'loginButton'      ).style.visibility = "visible";      
}



//-------------------------
function closeErrorPanel()
{
    document.getElementById( 'PopUpPanelError'      ).style.visibility = "hidden";    
    document.getElementById( 'cancelErrorButton'    ).style.visibility = "hidden";    
}



//-------------------------------------------------------------
// reflect the simulation's toggle states on the option buttons
//-------------------------------------------------------------
function syncToggleButtons()
{
    if ( typeof genePool == "undefined" ) return;

    setActive( 'freezeButton',   ! genePool.getSimulationRunning() );
    setActive( 'fastButton',     _runningFast );
    setActive( 'viewGoalButton', genePool.getRenderingGoals() );
    setActive( 'noRenderButton', ! genePool.getRendering() );
}

//----------------------------------
function toggleSimulationRunning()
{
    genePool.setSimulationRunning( ! genePool.getSimulationRunning() ); 
    syncToggleButtons();
}

//----------------------------------
function toggleFastRendering()
{
    if ( _runningFast )
    {
        _runningFast = false;
        genePool.setMillisecondsToDefault();
    }
    else
    {
        _runningFast = true;
        genePool.setMillisecondsPerUpdate(0);
    }
    syncToggleButtons();
}


//-------------------------
function toggleRendering()
{
    setRendering( ! genePool.getRendering() );
}

//-------------------------
function setRendering(r)
{
    genePool.setRendering( r ); 
    canvasID.style.visibility = r ? 'visible' : 'hidden';
    setShown( 'noRenderPanel', ! r );
    syncToggleButtons();
}


//---------------------------
function toggleGoalOverlay()
{
    genePool.toggleGoalOverlay();
    syncToggleButtons();
}


//-------------------------------
function clearViewMode()
{
    genePool.clearViewMode();
    clearViewModeButtons();
}


//-------------------------------
function clearViewModeButtons()
{
    for ( const [ buttonID ] of VIEW_MODE_BUTTONS )
    {
        setActive( buttonID, false );
    }
}

//----------------------------------------------------------
// highlight the button for the simulation's current view mode
//----------------------------------------------------------
function syncViewModeButtons()
{
    if ( typeof genePool == "undefined" ) return;

    let mode = genePool.getViewMode();
    for ( const [ buttonID, modeName ] of VIEW_MODE_BUTTONS )
    {
        setActive( buttonID, mode === ViewTrackingMode[ modeName ] );
    }
}


//---------------------------------------
function setViewMode( buttonID, viewMode )
{
    genePool.setViewMode( viewMode );
    closePopupPanel();		        

    //	the simulation may refuse a mode (e.g. 'selected' with nothing selected)
    syncViewModeButtons();
}


//-------------------------------
function choosePoolToLoad( pool )
{
    _chosenPoolToLoad = pool;
}


//------------------------------------
function requestToLoadPoolFromFile()
{
    /*
    if ( _username === "anonymous" )
    {   
        showAccountRequiredPopup( "Cannot load pool" );
    }
    else
    {
        //----------------------------------------
        // get the name of the pool to load...
        //----------------------------------------
        let poolText = "from file";

        //-----------------------------------------------
        // make the appropriate UI elements visible...
        //-----------------------------------------------
        document.getElementById( 'popUpPanel'               ).style.visibility = "visible";   
        document.getElementById( 'cancelPopUpPanelButton'   ).style.visibility = "visible";
        document.getElementById( 'savePopUpPanelButton'     ).style.visibility = "visible";   
        document.getElementById( 'noSavePopUpPanelButton'   ).style.visibility = "visible";   

        //-----------------------------------------------
        // ask the question...
        //-----------------------------------------------
        document.getElementById( 'popUpPanel' ).innerHTML 
        = "<br>" 
        + "Do you want to save the current pool" 
        + "<br>" 
        + "before loading " + poolText + "?";
    }
    */
    
}



//--------------------------------------
function requestToLoadPoolFromPreset()
{
    console.log( "requestToLoadPool " + _chosenPoolToLoad );

    //----------------------------------------
    // get the name of the pool to load...
    //----------------------------------------
    let poolText = "(ERROR)";

         if ( _chosenPoolToLoad === SimulationStartMode.RANDOM         ) { poolText = "'random'";        }     
    else if ( _chosenPoolToLoad === SimulationStartMode.NEIGHBORHOOD   ) { poolText = "'neighborhood'";  }
    else if ( _chosenPoolToLoad === SimulationStartMode.FROGGIES       ) { poolText = "'froggies'";      }
    else if ( _chosenPoolToLoad === SimulationStartMode.TANGO          ) { poolText = "'tango'";         }
    else if ( _chosenPoolToLoad === SimulationStartMode.RACE           ) { poolText = "'race'";          }
    else if ( _chosenPoolToLoad === SimulationStartMode.BIG_BANG       ) { poolText = "'big bang'";      }
    else if ( _chosenPoolToLoad === SimulationStartMode.BAD_PARENTS    ) { poolText = "'bad parents'";   }
    else if ( _chosenPoolToLoad === SimulationStartMode.EMPTY          ) { poolText = "'empty'";         }
    //else if ( _chosenPoolToLoad === SimulationStartMode.FILE           ) { poolText = "from file";       }
    
    //---------------------------------------------------------------------------------------
    // this overrides the UI asking the user to save the current pool first...
    //---------------------------------------------------------------------------------------
    switchToChosenPresetPool();
    

    /*
    //-----------------------------------------------
    // make the appropriate UI elements visible...
    //-----------------------------------------------
    document.getElementById( 'popUpPanel'               ).style.visibility = "visible";   
    document.getElementById( 'cancelPopUpPanelButton'   ).style.visibility = "visible";
    document.getElementById( 'savePopUpPanelButton'     ).style.visibility = "visible";   
    document.getElementById( 'noSavePopUpPanelButton'   ).style.visibility = "visible";   

    //-----------------------------------------------
    // ask the question...
    //-----------------------------------------------
    document.getElementById( 'popUpPanel' ).innerHTML 
    = "<br>" 
    + "Do you want to save the current pool" 
    + "<br>" 
    + "before loading " + poolText + "?";
    */
    
}



//----------------------------------
function switchToChosenPresetPool()
{
    //console.log( "switchToChosenPresetPool" );

    closePopupPanel();
    genePool.startSimulation( _chosenPoolToLoad ); 
    clearViewMode(); 
    updateEcosystemUI(); 
    _graph.initialize(); 
    setRendering( true );    
}


//--------------------------------
function loadSwimbotFromPreset(p)
{
    let genes = genePool.getPresetGenotype(p);
    genePool.createNewSwimbotWithGenes( genes );
}



//------------------------------------------------------
function setGeneTweakCategory( selectedSwimbotID, c )
{    
    _tweakGenesCategory = c;    
    updateGeneSliders( selectedSwimbotID );//
    //console.log( "_tweakGenesCategory = " + _tweakGenesCategory );
}


//---------------------------------------------
function tweakGene( swimbotIndex, sliderIndex )
{    
    let geneIndex = sliderIndex;
    
    if ( sliderIndex > 1 )
    {
        geneIndex += genePool.getNumGenesPerCategory() * _tweakGenesCategory;   
    }
    
    //-----------------------------------------
    // get the gene value...
    //-----------------------------------------
    //console.log( "geneIndex = " + geneIndex );

    let id = "geneTweaker" + sliderIndex;
 
    //console.log( id );
    
    let input = document.getElementById( id );

    let geneValue = input.value;

    //----------------------------------------------------------
    // update the gene value in the simulation...
    //----------------------------------------------------------
    genePool.tweakGene( swimbotIndex, geneIndex, geneValue );
        
    //----------------------------------------------------------
    // update the html that displays the value...
    //----------------------------------------------------------
    id = "gene" + sliderIndex + "Value";
    document.getElementById( id ).innerHTML = geneValue;
}


//----------------------------
function openInfoPanel()
{		    
    setShown( 'infoPanel', true );
    
    //let the current page load up
    setInfoPage( _currentInfoPage );
}


//---------------------------------------
function advanceInfoPage( increment )
{		    
    _currentInfoPage += increment;    
    
    if ( _currentInfoPage < FIRST_INFO_PAGE )
    {
        _currentInfoPage = FIRST_INFO_PAGE;
    }

    if ( _currentInfoPage > LAST_INFO_PAGE )
    {
        _currentInfoPage = LAST_INFO_PAGE;
    }

    setInfoPage( _currentInfoPage );
}




//---------------------------------------------
function setInfoPage( pageNumber )
{
    document.getElementById( 'pageNumberLabel'  ).innerHTML = "page " + _currentInfoPage + " of 28";
    document.getElementById( "infoText"         ).innerHTML = getInfoText( _currentInfoPage );    

    if ( _currentInfoPage === FIRST_INFO_PAGE )
    {
        document.getElementById( 'prevInfoButton' ).style.visibility = 'hidden'
    }
    else
    {
        document.getElementById( 'prevInfoButton' ).style.visibility = 'visible'
    }

    if ( _currentInfoPage === LAST_INFO_PAGE )
    {
        document.getElementById( 'nextInfoButton' ).style.visibility = 'hidden'
    }
    else
    {
        document.getElementById( 'nextInfoButton' ).style.visibility = 'visible'
    }
}



//-----------------------
function updateUI()
{
    //-----------------------------------------------------------------------------------
    // check that we have a genePool......
    //-----------------------------------------------------------------------------------
    if ( typeof genePool != 'undefined' )
    {    
        syncViewModeButtons();
        syncToggleButtons();

        if ( isShown( 'swimbotPanel' ) )
        {
            updateSwimbotPanel();
        }

        //-----------------------------------------------------------------------------------
        // always update the graph data, but only draw it when it is showing
        //-----------------------------------------------------------------------------------
        _graph.update( genePool.getTimeStep(), genePool.getNumSwimbots(), genePool.getNumFoodBits() , genePool.getNumFoodBits1() );
    
        if ( isShown( 'graphPanel' ) )
        {
            updateGraphPanel();
        }
    }
    
    //---------------------------
    // trigger next update...
    //---------------------------
    setTimeout( "updateUI()", UI_UPDATE_PERIOD );
}	


//---------------------------------------------------------
// show either the selected swimbot's details or the presets
//---------------------------------------------------------
function updateSwimbotPanel()
{
    let selectedSwimbot = genePool.getSelectedSwimbotID();

    setShown( 'selectedSwimbotPanel',   selectedSwimbot !== NULL_INDEX );
    setShown( 'noSelectedSwimbotPanel', selectedSwimbot === NULL_INDEX );

    if ( selectedSwimbot === NULL_INDEX ) return;

    let brainState = genePool.getSwimbotBrainState( selectedSwimbot );
    let mateString = genePool.getSwimbotChosenMate( selectedSwimbot ).toString();
    let goalDescription = "";

         if ( brainState ===  BRAIN_STATE_RESTING            ) { goalDescription = "resting";                       }
    else if ( brainState ===  BRAIN_STATE_LOOKING_FOR_MATE   ) { goalDescription = "looking for mate";              }
    else if ( brainState ===  BRAIN_STATE_PURSUING_MATE      ) { goalDescription = "pursuing mate " + mateString;   }
    else if ( brainState ===  BRAIN_STATE_LOOKING_FOR_FOOD   ) { goalDescription = "looking for food";              }
    else if ( brainState ===  BRAIN_STATE_PURSUING_FOOD      ) { goalDescription = "pursuing food";                 }

    let foodText = function( type )
    {
        let color = ( type === 1 ) ? LEGEND_FOODBIT1_COLOR : LEGEND_FOODBIT_COLOR;
        let name  = ( type === 1 ) ? "blue" : "green";
        return "<span class = 'food-dot' style = 'background:" + color + "'></span>" + name;
    }

    let stat = function( label, value, full )
    {
        return "<div class = 'stat" + ( full ? " full" : "" ) + "'>"
             + "<div class = 'stat-label'>" + label + "</div>"
             + "<div class = 'stat-value'>" + value + "</div></div>";
    }

    document.getElementById( 'swimbotDataPanel' ).innerHTML
    = "<div class = 'swimbot-header'>"
    +   "<div class = 'swimbot-name'>Swimbot " + genePool.getSwimbotIndex( selectedSwimbot ) + "</div>"
    +   "<div class = 'swimbot-goal'>" + goalDescription + "</div>"
    + "</div>"
    + "<div class = 'stat-grid'>"
    +   stat( "age",               genePool.getSwimbotAge( selectedSwimbot ) )
    +   stat( "energy",            Math.floor( genePool.getSwimbotEnergy( selectedSwimbot ) ) )
    +   stat( "food bits eaten",   Math.floor( genePool.getSwimbotNumFoodBitsEaten( selectedSwimbot ) ) )
    +   stat( "offspring",         Math.floor( genePool.getSwimbotNumOffspring( selectedSwimbot ) ) )
    +   stat( "prefers food",      foodText( genePool.getSwimbotPreferredFoodType ( selectedSwimbot ) ) )
    +   stat( "digests best",      foodText( genePool.getSwimbotDigestibleFoodType( selectedSwimbot ) ) )
    +   stat( "sexual attraction", genePool.getSwimbotAttractionDescription( selectedSwimbot ), true )
    + "</div>";
}


//-----------------------------------
// population numbers + graph drawing
//-----------------------------------
function updateGraphPanel()
{
    let item = function( color, label, value )
    {
        return "<div class = 'legend-item'>"
             + "<span class = 'legend-swatch' style = 'background:" + color + "'></span>"
             + "<div><div class = 'legend-label'>" + label + "</div>"
             + "<div class = 'legend-value'>" + value + "</div></div></div>";
    }

    document.getElementById( 'graphData' ).innerHTML
    = "<div class = 'legend'>"
    + item( "rgba(255,255,255,0.35)", "time step",        genePool.getTimeStep()     )
    + item( LEGEND_SWIMBOT_COLOR,     "swimbots",         genePool.getNumSwimbots()  )
    + item( LEGEND_FOODBIT_COLOR,     "green food bits",  genePool.getNumFoodBits()  )
    + item( LEGEND_FOODBIT1_COLOR,    "blue food bits",   genePool.getNumFoodBits1() )
    + "</div>";

    _graph.render();
}


//----------------------------------------
function notifyGeneTweakPanelMouseDown()
{ 
    let selectedSwimbotID = genePool.getSelectedSwimbotID();
    
    if ( selectedSwimbotID === -1 )
    {
        closeTweakGenesPanel();
    }
    else if ( isShown( 'tweakGenesModal' ) )
    {		        	        
        openTweakGenesPanel( selectedSwimbotID );
    }
}


//----------------------------------------------------------
// size the pool canvas to fill the stage (left of the panel)
//----------------------------------------------------------
function resize()
{ 
    let stage = document.getElementById( 'stage' );

    canvasID.width  = Math.max( 1, stage.clientWidth  );
    canvasID.height = Math.max( 1, stage.clientHeight );
    
    if ( typeof genePool != 'undefined' )
    {    
        genePool.setCanvasDimensions( canvasID.width, canvasID.height );  
    }
}

//	the stage changes size when the window or the panel does
new ResizeObserver( function() { resize(); } ).observe( document.getElementById( 'stage' ) );


//------------------------------------------------------------
// pointer position relative to the pool canvas
//------------------------------------------------------------
function canvasX( e ) { return e.clientX - canvasID.getBoundingClientRect().left; }
function canvasY( e ) { return e.clientY - canvasID.getBoundingClientRect().top;  }


//------------------------------------------------------------
document.getElementById( 'Canvas' ).onmousedown = function(e) 
{
    clearViewMode();

    if ( typeof genePool != "undefined" ) 
    {    
        genePool.touchDown( canvasX( e ), canvasY( e ) );  
    }
        
    notifyGeneTweakPanelMouseDown();
}

//------------------------------------------------------------
document.getElementById( 'Canvas' ).onmousemove = function(e) 
{
    if ( typeof genePool != "undefined" ) 
    {    
        genePool.touchMove( canvasX( e ), canvasY( e ) );
    }
}

//------------------------------------------------------------
document.getElementById( 'Canvas' ).onmouseup = function(e) 
{
    if ( typeof genePool != "undefined" ) 
    {    
        genePool.touchUp( canvasX( e ), canvasY( e ) );
    } 			
}

//------------------------------------------------------------
document.getElementById( 'Canvas' ).onmouseout = function(e) 
{
    if ( typeof genePool != "undefined" ) 
    {    
        genePool.touchOut( canvasX( e ), canvasY( e ) );
    } 			
}


//------------------------------------------------------------
// mouse wheel zooms in and out around the mouse position
//------------------------------------------------------------
document.getElementById( 'Canvas' ).addEventListener( 'wheel', function(e) 
{
    e.preventDefault();

    if ( typeof genePool != "undefined" ) 
    {    
        clearViewMode();

        let delta = e.deltaY;
        if ( e.deltaMode === 1 ) { delta *= 16;  }  // scrolling by lines
        if ( e.deltaMode === 2 ) { delta *= 400; }  // scrolling by pages

        let factor = Math.exp( delta * 0.0015 );    // one wheel notch is about 15%
        genePool.zoomAtScreenPosition( canvasX( e ), canvasY( e ), factor );
    }
}, { passive: false } );


/*
//-------------------------------------------------------------------
// This is a rather hacky way of getting a two-finger translational
// gesture (a 2D vector) to be used for scrolling and stuff
//-------------------------------------------------------------------
window.onwheel = function(e) 
{
    genePool.touchTwoFingerMove(e); 
    //e.preventDefault();
}
*/

//--------------------------------
// key down
//--------------------------------
document.onkeydown = function(e) 
{
	if ( typeof genePool == "undefined" ) return;

    e = e || window.event;
    
    //-----------------------------
    // keys for camera navigation
    //-----------------------------
    let cameraNavAction = -1; 
    
    if ( e.keyCode ===  37 ) // left arrow key
    { 
        cameraNavAction = CameraNavigationAction.LEFT;    

//unfinished work - I'm trying to make it so that when a camera nav button is pressed on the keyboard, 
// the equivalent button highlights on the screen.
//document.getElementById( 'leftNav' ).style = 'background-image: url( "../../images/left-pressed.png" );'   
//document.getElementById( 'leftNav'    ).style = "border-bottom-width: 3; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;"
             
    } 
    
    if ( e.keyCode ===  39 ) { cameraNavAction = CameraNavigationAction.RIGHT;   } // right arrow key
    if ( e.keyCode ===  38 ) { cameraNavAction = CameraNavigationAction.UP;      } // up arrow key
    if ( e.keyCode ===  40 ) { cameraNavAction = CameraNavigationAction.DOWN;    } // down arrow key
    if ( e.keyCode ===  61 ) { cameraNavAction = CameraNavigationAction.IN;      } // plus key
    if ( e.keyCode === 173 ) { cameraNavAction = CameraNavigationAction.OUT;     } // minus key

    //apparently, Chrome and Safari  use different key codes...
    if ( e.keyCode === 187 ) { cameraNavAction = CameraNavigationAction.IN;      } // plus key
    if ( e.keyCode === 189 ) { cameraNavAction = CameraNavigationAction.OUT;     } // minus key
    
    if ( cameraNavAction != -1 )
    {
        if ( ! genePool.getCameraNavigationActive( cameraNavAction ) ) 
        { 
            genePool.startCameraNavigation( cameraNavAction );
            clearViewMode(); 
        }
    }

    //--------------------------------------------------------------------
	//	allow currently implemented renderer to do it's thang
    //--------------------------------------------------------------------
	globalRenderer.handleRenderSpecificKeyDown( e.keyCode, e.shiftKey, e.ctrlKey, e.altKey );

    //-----------------------------
    // other key pres events
    //-----------------------------
    /*
    if ( e.keyCode === 75 ) // K key
    { 
        let selectedSwimbot = genePool.getSelectedSwimbotID();
        if ( selectedSwimbot != -1 )
        {
            genePool.killSwimbot( selectedSwimbot ); 
        } 
    }
    if ( e.keyCode === 67 ) // C key
    { 
        let selectedSwimbot = genePool.getSelectedSwimbotID();
        if ( selectedSwimbot != -1 )
        {
            genePool.cloneSwimbot( selectedSwimbot ); 
        } 
    }
    */
    
                            
    //console.log( "onkeydown " + e.keyCode );
}

//------------------------------
document.onkeyup = function(e) 
{
	if ( typeof genePool == "undefined" ) return;
    genePool.stopCameraNavigation( CameraNavigationAction.LEFT  );
    genePool.stopCameraNavigation( CameraNavigationAction.RIGHT );
    genePool.stopCameraNavigation( CameraNavigationAction.UP    );
    genePool.stopCameraNavigation( CameraNavigationAction.DOWN  );
    genePool.stopCameraNavigation( CameraNavigationAction.IN    );
    genePool.stopCameraNavigation( CameraNavigationAction.LEFT  );
    
/*
#leftNav
{
    left:   25; 
    top:    30;
    background-image: url( "../images/left.png" );
}
*/

    //--------------------------------------------------------------------
	//	allow currently implemented renderer to do it's thang
    //--------------------------------------------------------------------
	globalRenderer.handleRenderSpecificKeyUp( e.keyCode, e.shiftKey, e.ctrlKey, e.altKey );
};
