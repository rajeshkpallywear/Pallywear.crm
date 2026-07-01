import React from 'react';
import { 
  User, 
  Wallet, 
  Settings, 
  Factory, 
  Truck, 
  CheckCircle, 
  Paintbrush, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface WorkflowVisualizerProps {
  order: Order;
}

export default function WorkflowVisualizer({ order }: WorkflowVisualizerProps) {
  const currentStatus = order.status;
  const isHeld = currentStatus === OrderStatus.HOLD;
  // If held, evaluate previous status to know where the error/hold occurred
  const activeStatus = isHeld ? (order.previousStatus || OrderStatus.ACCOUNTS) : currentStatus;

  // Determine which sub-designer node is active
  const isOMOriginDesign = order.notes?.includes('[ORDER MGMT -> DESIGNER]') || order.previousStatus === OrderStatus.ORDER_MANAGEMENT;
  
  // Node states: 'future' | 'active' | 'completed'
  const getStageState = (stages: OrderStatus[]): 'future' | 'active' | 'completed' => {
    if (isHeld && stages.includes(order.previousStatus || OrderStatus.ACCOUNTS)) {
      return 'active'; // Will be styled as red alert
    }
    
    // Check if the current actual status matches any of the stages
    if (stages.includes(currentStatus)) {
      return 'active';
    }

    // Determine sequence completion
    const sequence = [
      OrderStatus.DRAFT, 
      OrderStatus.PENDING, 
      OrderStatus.ACCOUNTS, 
      OrderStatus.ORDER_MANAGEMENT, 
      OrderStatus.PRODUCTION, 
      OrderStatus.DELIVERY, 
      OrderStatus.DELIVERED
    ];
    
    const maxActiveIndex = Math.max(...stages.map(s => sequence.indexOf(s)));
    const currentActiveIndex = sequence.indexOf(activeStatus);

    if (currentActiveIndex > maxActiveIndex) {
      return 'completed';
    }
    return 'future';
  };

  // Node styles
  const getNodeStyles = (state: 'future' | 'active' | 'completed', nodeIsHeld: boolean) => {
    if (nodeIsHeld && state === 'active') {
      return {
        bg: 'bg-red-50 border-red-500 text-red-600 shadow-lg shadow-red-100 animate-pulse',
        text: 'text-red-700 font-extrabold',
        iconBg: 'bg-red-500 text-white'
      };
    }
    switch (state) {
      case 'active':
        return {
          bg: 'bg-purple-50 border-purple-600 text-purple-700 shadow-md ring-2 ring-purple-100 animate-pulse-subtle',
          text: 'text-purple-900 font-extrabold',
          iconBg: 'bg-purple-600 text-white'
        };
      case 'completed':
        return {
          bg: 'bg-green-50 border-green-500 text-green-700 shadow-sm',
          text: 'text-gray-900 font-bold',
          iconBg: 'bg-green-500 text-white'
        };
      case 'future':
      default:
        return {
          bg: 'bg-gray-50 border-gray-200 text-gray-400',
          text: 'text-gray-400 font-medium',
          iconBg: 'bg-gray-200 text-gray-500'
        };
    }
  };

  // Define nodes in the pipeline
  const staffState = getStageState([OrderStatus.DRAFT, OrderStatus.PENDING]);
  const designerStaffState = currentStatus === OrderStatus.DESIGN && !isOMOriginDesign ? 'active' : (getStageState([OrderStatus.DRAFT, OrderStatus.PENDING]) === 'completed' && activeStatus !== OrderStatus.DESIGN ? 'completed' : 'future');
  
  const accountsState = getStageState([OrderStatus.ACCOUNTS]);
  const omState = getStageState([OrderStatus.ORDER_MANAGEMENT]);
  
  // OM design sub-node
  const designerOMState = currentStatus === OrderStatus.DESIGN && isOMOriginDesign ? 'active' : 'future';
  // OM digitizer sub-node: considered active if OM is active, or if we have digitizer files ready/not ready
  const digitizerOMState = (activeStatus === OrderStatus.ORDER_MANAGEMENT || activeStatus === OrderStatus.PRODUCTION) && !order.machineFiles?.length 
    ? 'active' 
    : (order.machineFiles && order.machineFiles.length > 0 ? 'completed' : 'future');

  const productionState = getStageState([OrderStatus.PRODUCTION]);
  const deliveryState = getStageState([OrderStatus.DELIVERY]);
  const customerState = getStageState([OrderStatus.DELIVERED]);

  // Is this specific node the direct cause of holds?
  const isStaffHeld = isHeld && (order.previousStatus === OrderStatus.PENDING || order.previousStatus === OrderStatus.DRAFT);
  const isAccountsHeld = isHeld && order.previousStatus === OrderStatus.ACCOUNTS;
  const isOMHeld = isHeld && order.previousStatus === OrderStatus.ORDER_MANAGEMENT;
  const isProdHeld = isHeld && order.previousStatus === OrderStatus.PRODUCTION;
  const isDeliveryHeld = isHeld && order.previousStatus === OrderStatus.DELIVERY;

  const staffStyles = getNodeStyles(staffState, isStaffHeld);
  const designerStaffStyles = getNodeStyles(designerStaffState, false);
  const accountsStyles = getNodeStyles(accountsState, isAccountsHeld);
  const omStyles = getNodeStyles(omState, isOMHeld);
  const designerOMStyles = getNodeStyles(designerOMState, false);
  const digitizerOMStyles = getNodeStyles(digitizerOMState, false);
  const productionStyles = getNodeStyles(productionState, isProdHeld);
  const deliveryStyles = getNodeStyles(deliveryState, isDeliveryHeld);
  const customerStyles = getNodeStyles(customerState, false);

  return (
    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm w-full font-sans select-none overflow-x-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Active Step Tracker</h4>
          <p className="text-xs text-gray-500 font-medium">Visualizing Pallywear workflow blueprint</p>
        </div>
        {isHeld && (
          <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 animate-pulse">
            <AlertCircle size={10} /> Held at {activeStatus.replace('_', ' ')}
          </span>
        )}
      </div>

      <div className="min-w-[800px] py-6 relative flex flex-col items-center">
        {/* Main pipeline horizontal conveyor */}
        <div className="flex items-center justify-between w-full px-6 relative z-10">
          
          {/* Node 1: Staff */}
          <div className="flex flex-col items-center shrink-0 w-28 relative">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${staffStyles.bg}`}>
              <User size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${staffStyles.text}`}>Staff</span>
            
            {/* Vertical connector line to Designer node underneath */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[3px] h-10 bg-gray-200">
              <div className={`w-full h-full ${designerStaffState === 'active' ? 'bg-purple-500 animate-pulse' : (staffState === 'completed' ? 'bg-green-500' : 'bg-gray-200')}`} />
            </div>
          </div>

          {/* Line 1 -> 2 */}
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[30px]">
            <div className={`absolute inset-0 h-full ${accountsState === 'completed' || accountsState === 'active' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>

          {/* Node 2: Accounts */}
          <div className="flex flex-col items-center shrink-0 w-28">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${accountsStyles.bg}`}>
              <Wallet size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${accountsStyles.text}`}>Accounts</span>
          </div>

          {/* Line 2 -> 3 */}
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[30px]">
            <div className={`absolute inset-0 h-full ${omState === 'completed' || omState === 'active' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>

          {/* Node 3: Order Management */}
          <div className="flex flex-col items-center shrink-0 w-32 relative">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${omStyles.bg}`}>
              <Settings size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${omStyles.text}`}>Order Mgmt</span>

            {/* Diagonal Left Anchor vertical line down to Designer */}
            <div className="absolute top-12 left-1/4 w-[3px] h-10 bg-gray-200 origin-top rotate-[25deg]">
              <div className={`w-full h-full ${designerOMState === 'active' ? 'bg-purple-500 animate-pulse' : 'bg-gray-200'}`} />
            </div>

            {/* Diagonal Right Anchor vertical line down to Digitizer */}
            <div className="absolute top-12 right-1/4 w-[3px] h-10 bg-gray-200 origin-top -rotate-[25deg]">
              <div className={`w-full h-full ${digitizerOMState === 'active' ? 'bg-purple-500 animate-pulse' : (digitizerOMState === 'completed' ? 'bg-green-500' : 'bg-gray-200')}`} />
            </div>
          </div>

          {/* Line 3 -> 4 */}
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[30px]">
            <div className={`absolute inset-0 h-full ${productionState === 'completed' || productionState === 'active' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>

          {/* Node 4: Production */}
          <div className="flex flex-col items-center shrink-0 w-28">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${productionStyles.bg}`}>
              <Factory size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${productionStyles.text}`}>Production</span>
          </div>

          {/* Line 4 -> 5 */}
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[30px]">
            <div className={`absolute inset-0 h-full ${deliveryState === 'completed' || deliveryState === 'active' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>

          {/* Node 5: Delivery */}
          <div className="flex flex-col items-center shrink-0 w-28">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${deliveryStyles.bg}`}>
              <Truck size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${deliveryStyles.text}`}>Delivery</span>
          </div>

          {/* Line 5 -> 6 */}
          <div className="flex-1 h-1 bg-gray-200 mx-2 relative min-w-[30px]">
            <div className={`absolute inset-0 h-full ${customerState === 'completed' || customerState === 'active' ? 'bg-green-500' : 'bg-gray-200'}`} />
          </div>

          {/* Node 6: Customer */}
          <div className="flex flex-col items-center shrink-0 w-28">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${customerStyles.bg}`}>
              <CheckCircle size={20} />
            </div>
            <span className={`text-[10px] mt-2 text-center uppercase tracking-wider ${customerStyles.text}`}>Customer</span>
          </div>

        </div>

        {/* Parallel Auxiliary elements level (Row 2 underneath) */}
        <div className="w-full relative mt-9 min-h-[48px]">
          {/* Sub designer node aligned vertically under Staff */}
          <div className="absolute left-6 w-28 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all text-xs ${designerStaffStyles.bg}`}>
              <Paintbrush size={16} />
            </div>
            <span className={`text-[9px] mt-1.5 text-center uppercase tracking-wider ${designerStaffStyles.text}`}>Designer</span>
          </div>

          {/* Sub designer node diagonal left under Order Management */}
          <div className="absolute left-[30.5%] w-24 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all text-xs ${designerOMStyles.bg}`}>
              <Paintbrush size={16} />
            </div>
            <span className={`text-[9px] mt-1.5 text-center uppercase tracking-wider ${designerOMStyles.text}`}>Designer</span>
          </div>

          {/* Sub digitizer node diagonal right under Order Management */}
          <div className="absolute left-[44%] w-24 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all text-xs ${digitizerOMStyles.bg}`}>
              <Cpu size={16} />
            </div>
            <span className={`text-[9px] mt-1.5 text-center uppercase tracking-wider ${digitizerOMStyles.text}`}>Digitizer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
