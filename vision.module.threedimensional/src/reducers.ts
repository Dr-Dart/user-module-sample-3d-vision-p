import { createStore } from 'redux'

//// define state
const initialState = {
    ip: [0, 0, 0, 0],
    port: [11004, 11003],
    speed: [20, 20],
    connectionState: 0,
    DART_MONITORING_DNS: "http://192.168.137.104/",
    DART_MONITORING_PAGES: "",
    homepose: [0, 0, 90, 0, 90, 0],
    calpose1: [14.882, 35.244, 69.174, -18.363, 112.904, -138.364],
    calpose2: [28.295, -0.959, 117.902, -47.724, 56.676, -74.845],
    calpose3: [-33.701, 1.664, 115.257, 47.265, 60.254, -128.953],
    calpose4: [-18.206, 36.768, 66.621, 16.316, 114.844, -64.686],
    calpose5: [5.675, 12.069, 84.905, 29.343, 51.126, 1.786],
    calpose6: [6.252, 6.326, 91.682, 31.054, 109.944, 41.445],
    calpose7: [-11.246, 7.104, 90.807, -33.175, 107.386, 74.082],
    calpose8: [-10.215, 12.782, 84.025, -26.477, 49.166, 112.925],
    calpose9: [-2.425, 9.516, 92.001, 0.004, 78.473, -2.436],
    sol_id: 1,
    vs_id: 1,
    startpose: [0, 0, 0, 0, 0, 0],
    endpose: [0, 0, 0, 0, 0, 0],
    state_ip: false, // 0:none, gray or red , 1:success, green
    state_tcp: [false, false],
    state_cali: false,
    state_sol: false,
    jointmax: [360, 360, 360, 360, 360, 360],
    jointmin: [-360, -360, -360, -360, -360, -360]
}; 

//// define action type
const SETIP = "SETIP"
const SETDNS = "SETDNS"
const SETCLICK = "SETCLICK"
const SETCONNECTIONSTATE = "SETCONNECTIONSTATE"
const UNSETCLICK = "UNSETCLICK"
const IFRAMEBTNCLICK = "IFRAMEBTNCLICK"
const SETPORT = "SETPORT"
const SETSPEED = "SETSPEED"
const SETHOMEPOSE = "SETHOMEPOSE"
const SETCALPOSE1 = "SETCALPOSE1"
const SETCALPOSE2 = "SETCALPOSE2"
const SETCALPOSE3 = "SETCALPOSE3"
const SETCALPOSE4 = "SETCALPOSE4"
const SETCALPOSE5 = "SETCALPOSE5"
const SETCALPOSE6 = "SETCALPOSE6"
const SETCALPOSE7 = "SETCALPOSE7"
const SETCALPOSE8 = "SETCALPOSE8"
const SETCALPOSE9 = "SETCALPOSE9"
const SETSOLID = "SETSOLID"
const SETVSID = "SETVSID"
const SETSTARTPOSE = "SETSTARTPOSE"
const SETENDPOSE = "SETENDPOSE"
const SETSTATEIP = "SETSTATEIP"
const SETSTATETCP = "SETSTATETCP"
const SETSTATECALI = "SETSTATECALI"
const SETSTATESOL = "SETSTATESOL"
const SETJOINTMAX = "SETJOINTMAX"
const SETJOINTMIN = "SETJOINTMIN"

//// define action creator
export function setIp(value: number[]) {
    return {
        type: SETIP,
        value: value
    };
}

export function setDns(value: string) {
    return {
        type: SETDNS,
        value: value
    };
}

export function setClick(value: string) {
    return {
        type: SETCLICK,
        value: value
    };
}

export function setConnectionState(value: number) {
    return {
        type: SETCONNECTIONSTATE,
        value: value
    };
}

export function unsetClick(value: number) {
    return {
        type: UNSETCLICK,
        value: value
    };
}

export function iframeBtnClick(value: string) {
    return {
        type: IFRAMEBTNCLICK,
        value: value
    };
}

export function setPort(value: number[]) {
    return {
        type: SETPORT,
        value: value
    };
}

export function setSpeed(value: number[]) {
    return {
        type: SETSPEED,
        value: value
    };
}

export function setHomepose(value: number[]) {
    return {
        type: SETHOMEPOSE,
        value: value
    };
}

export function setCalpose1(value: number[]) {
    return {
        type: SETCALPOSE1,
        value: value
    };
}
export function setCalpose2(value: number[]) {
    return {
        type: SETCALPOSE2,
        value: value
    };
}
export function setCalpose3(value: number[]) {
    return {
        type: SETCALPOSE3,
        value: value
    };
}
export function setCalpose4(value: number[]) {
    return {
        type: SETCALPOSE4,
        value: value
    };
}
export function setCalpose5(value: number[]) {
    return {
        type: SETCALPOSE5,
        value: value
    };
}
export function setCalpose6(value: number[]) {
    return {
        type: SETCALPOSE6,
        value: value
    };
}
export function setCalpose7(value: number[]) {
    return {
        type: SETCALPOSE7,
        value: value
    };
}
export function setCalpose8(value: number[]) {
    return {
        type: SETCALPOSE8,
        value: value
    };
}
export function setCalpose9(value: number[]) {
    return {
        type: SETCALPOSE9,
        value: value
    };
}

export function setSolutionID(value: number) {
    return {
        type: SETSOLID,
        value: value
    };
}

export function setVisionSystemID(value: number) {
    return {
        type: SETVSID,
        value: value
    };
}

export function setStartpose(value: number[]) {
    return {
        type: SETSTARTPOSE,
        value: value
    };
}
export function setEndpose(value: number[]) {
    return {
        type: SETENDPOSE,
        value: value
    };
}
export function setStateIp(value: boolean) {
    return {
        type: SETSTATEIP,
        value: value
    };
}
export function setStateTcp(value: boolean[]) {
    return {
        type: SETSTATETCP,
        value: value
    };
}
export function setStateCali(value: boolean) {
    return {
        type: SETSTATECALI,
        value: value
    };
}
export function setStateSol(value: boolean) {
    return {
        type: SETSTATESOL,
        value: value
    };
}
export function setJointMax(value: number[]) {
    return {
        type: SETJOINTMAX,
        value: value
    };
}
export function setJointMin(value: number[]) {
    return {
        type: SETJOINTMIN,
        value: value
    };
}

//// define reducer
export function reducer(state = initialState, action: any) {
    switch (action.type) {
        case SETIP:
            return {
                ...state,
                ip: action.value
            };
        case SETDNS:
            return {
                ...state,
                DART_MONITORING_DNS: action.value
            };
        case SETCLICK:
            return {
                ...state,
                DART_MONITORING_PAGES: action.value
            };
        case SETCONNECTIONSTATE:
            return {
                ...state,
                connectionState: action.value
            };
        case UNSETCLICK:
            return {
                ...state,
                connectionState: action.value
            };
        case IFRAMEBTNCLICK:
            return {
                ...state,
                DART_MONITORING_PAGES: action.value
            };
        case SETPORT:
            return {
                ...state,
                port: action.value
            };  
        case SETSPEED:
            return {
                ...state,
                speed: action.value
            };
        case SETHOMEPOSE:
            return {
                ...state,
                homepose: action.value
            };
        case SETCALPOSE1:
            return {
                ...state,
                calpose1: action.value
            };
        case SETCALPOSE2:
            return {
                ...state,
                calpose2: action.value
            };
        case SETCALPOSE3:
            return {
                ...state,
                calpose3: action.value
            };
        case SETCALPOSE4:
            return {
                ...state,
                calpose4: action.value
            };
        case SETCALPOSE5:
            return {
                ...state,
                calpose5: action.value
            };
        case SETCALPOSE6:
            return {
                ...state,
                calpose6: action.value
            };
        case SETCALPOSE7:
            return {
                ...state,
                calpose7: action.value
            };
        case SETCALPOSE8:
            return {
                ...state,
                calpose8: action.value
            };
        case SETCALPOSE9:
            return {
                ...state,
                calpose9: action.value
            };

        case SETSOLID:
            return {
                ...state,
                sol_id: action.value
            };
        case SETVSID:
            return {
                ...state,
                vs_id: action.value
            };
        case SETSTARTPOSE:
            return {
                ...state,
                startpose: action.value
            };
        case SETENDPOSE:
            return {
                ...state,
                endpose: action.value
            };
        case SETSTATEIP:
            return {
                ...state,
                state_ip: action.value
            };
        case SETSTATETCP:
            return {
                ...state,
                state_tcp: action.value
            };
        case SETSTATECALI:
            return {
                ...state,
                state_cali: action.value
            };
        case SETSTATESOL:
            return {
                ...state,
                state_sol: action.value
            };

        case SETJOINTMAX:
            return {
                ...state,
                jointmax: action.value
            };

        case SETJOINTMIN:
            return {
                ...state,
                jointmin: action.value
            };
        default:
            return state;
    }
}

//// define store
const store = createStore(reducer);

export default store;
