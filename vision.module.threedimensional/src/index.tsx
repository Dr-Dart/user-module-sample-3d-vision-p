import {
    System,
    BaseModule,
    ModuleScreen,
    IModuleChannel,
    Message,
    logger,
    ModuleScreenProps,
    IToast,
    Toast,
    ModuleContext,
    ProgramState,
    ModuleService,
    IRobotManager,
    ProgramStopType,
    INetworkManager,
} from 'dart-api';
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Button, Divider, FormControl, FormGroup, FormLabel, Tabs, Tab, TextField } from '@mui/material';
import styles from './assets/styles/styles.scss';
import IcnReset from './assets/images/icon_reset.svg';
import StatusIcon from './assets/images/status_icon_circle.svg';
import Calibration from './tabs/Calibration';
import Solutions from './tabs/Solutions';
import { Context, IDartFileSystem, IProgramManager, MonitoringVariable } from 'dart-api';
import { DRL_port_test, DRL_port_test_ALL, DRL_port_test_RSS, DRL_port_test_BPS } from './drl/drl';
import store, {
    setIp,
    setDns,
    setClick,
    setConnectionState,
    unsetClick,
    iframeBtnClick,
    setPort,
    setSpeed,
    setHomepose,
    setCalpose1,
    setCalpose2,
    setCalpose3,
    setCalpose4,
    setCalpose5,
    setCalpose6,
    setCalpose7,
    setCalpose8,
    setCalpose9,
    setSolutionID,
    setVisionSystemID,
    setStartpose,
    setEndpose,
    setStateIp,
    setStateTcp,
    setStateCali,
    setStateSol,
} from './reducers';
import { Provider } from 'react-redux';
import { IDartDatabase } from 'dart-api';
import PipScreenForTaskEditor from './PIPscreen';
import ServiceForTaskEditor from './PIPservice';
const TABLE_PHOTONEO_NAME = 'photoneo';
const TABLE_PHOTONEO_COLUMNS = ['data', 'drl_inputs', 'drl_userdefine', 'drl_main'];
import { messages } from './messages';

// IIFE for register a function to create an instance of main class which is inherited BaseModule.
(() => {
    System.registerModuleMainClassCreator((packageInfo) => new Module(packageInfo));
})();
class Module extends BaseModule {
    getModuleScreen(componentId: string) {
        if (componentId === 'MainScreen') {
            return MainScreen;
        } else if (componentId === 'pip_photoneo_drl') {
            return PipScreenForTaskEditor;
        }
        return null;
    }
    getModuleService(componentId: string): typeof ModuleService | null {
        if (componentId === 'pip_photoneo_drl') {
            return ServiceForTaskEditor;
        }
        return null;
    }
}
interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} {...other}>
            {value === index && <>{children}</>}
        </div>
    );
}
function IPSet(result: boolean) {
    if (result) {
        Toast.show(IToast.TYPE_SUCCESS, null, messages.toast_message_001, true);
    } else {
        Toast.show(IToast.TYPE_ERROR, null, messages.toast_message_002, true);
    }
}
function IPUnset() {
    Toast.show(IToast.TYPE_INFO, null, messages.toast_message_003, true);
}
class MainScreen extends ModuleScreen {
    private programManager: IProgramManager;
    private fileSystem: IDartFileSystem;
    private robotManager: IRobotManager;
    private networkManager: INetworkManager;
    private readonly CONNECTION_STATE = {
        NOT_CONNECTED: 0,
        CONNECTED: 1,
    };
    private db: IDartDatabase | null;
    unsubscribe = null;
    default_port = [11004, 11003];
    constructor(props: ModuleScreenProps) {
        super(props);
        this.programManager = this.moduleContext.getSystemManager(Context.PROGRAM_MANAGER) as IProgramManager;
        this.fileSystem = this.moduleContext.getSystemLibrary(Context.DART_FILE_SYSTEM) as IDartFileSystem;
        const moduleRootPath = this.fileSystem.getModuleRootDirPath(this.moduleContext);
        this.robotManager = this.moduleContext.getSystemManager(Context.ROBOT_MANAGER) as IRobotManager;
        this.networkManager = this.moduleContext.getSystemManager(Context.NETWORK_MANAGER) as INetworkManager;
        this.db = this.moduleContext.getSystemLibrary(Context.DART_DATABASE) as IDartDatabase;
        this.state = {
            value: 0,
            ip: store.getState().ip,
            port: store.getState().port,
            connectionState: this.CONNECTION_STATE.NOT_CONNECTED,
            DART_MONITORING_DNS: 'http://192.168.137.104/',
            DART_MONITORING_PAGES: '',
            state_ip: false,
            state_tcp: [false, false],
            state_cali: false,
            state_sol: false,
            iframe_btn_click: ['secondary', 'secondary', 'secondary', 'info'],
            tcp_btn_rss_apply: false,
            tcp_btn_rss_reset: false,
            tcp_btn_bps_apply: false,
            tcp_btn_bps_reset: false,
        };
    }
    componentDidMount = async () => {
        logger.debug(`componentDidMount: ${this.moduleContext.componentId}`);
        const result = await this.db?.createTable(TABLE_PHOTONEO_NAME, TABLE_PHOTONEO_COLUMNS, true);
        if (result) {
            const queryResult = await this.db?.query(TABLE_PHOTONEO_NAME, TABLE_PHOTONEO_COLUMNS, {});
            if (queryResult?.length === 0) {
                const tmp = store.getState();
                await this.db?.insert(TABLE_PHOTONEO_NAME, [JSON.stringify(store.getState()), '', '', '']);
            }
            this.db?.query(TABLE_PHOTONEO_NAME, TABLE_PHOTONEO_COLUMNS, {}).then((queryResult) => {
                const tmp = JSON.parse(queryResult[0].data.data);
                this.setState({
                    ip: tmp.ip,
                    port: tmp.port,
                });
                store.dispatch(setIp(tmp.ip));
                store.dispatch(setPort(tmp.port));
                store.dispatch(setSpeed(tmp.speed));
                store.dispatch(setConnectionState(tmp.connectionState));
                store.dispatch(setDns(tmp.DART_MONITORING_DNS));
                store.dispatch(iframeBtnClick(tmp.DART_MONITORING_PAGES));
                store.dispatch(setHomepose(tmp.homepose));
                store.dispatch(setCalpose1(tmp.calpose1));
                store.dispatch(setCalpose2(tmp.calpose2));
                store.dispatch(setCalpose3(tmp.calpose3));
                store.dispatch(setCalpose4(tmp.calpose4));
                store.dispatch(setCalpose5(tmp.calpose5));
                store.dispatch(setCalpose6(tmp.calpose6));
                store.dispatch(setCalpose7(tmp.calpose7));
                store.dispatch(setCalpose8(tmp.calpose8));
                store.dispatch(setCalpose9(tmp.calpose9));
                store.dispatch(setSolutionID(tmp.sol_id));
                store.dispatch(setVisionSystemID(tmp.vs_id));
                store.dispatch(setStartpose(tmp.startpose));
                store.dispatch(setEndpose(tmp.endpose));
            });
        }
        this.unsubscribe = store.subscribe(() => {
            this.db
                ?.update(
                    TABLE_PHOTONEO_NAME,
                    {},
                    {
                        data: JSON.stringify(store.getState()),
                    },
                )
                .then((result) => {
                    if (result) {
                        logger.debug(` update Success`);
                    } else {
                        logger.warn(` updateFailed`);
                    }
                });
        });
        this.UiUpdate('init');
    };
    componentWillUnmount() {
        logger.debug(`componentWillUnmount: ${this.moduleContext.componentId}`);
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.unsubscribe = null;
    }
    onBind(message: Message, channel: IModuleChannel): boolean {
        logger.debug(`onBind: ${this.moduleContext.componentId}, ${JSON.stringify(message)}`);
        return false;
    }
    onUnbind(message: Message) {
        logger.debug(`onUnbind: ${this.moduleContext.componentId}, ${JSON.stringify(message)}`);
    }
    handleChange = (event: React.SyntheticEvent, newValue: number) => {
        this.setState({
            ...this.state,
            value: newValue,
        });
    };
    a11yProps(index: number) {
        return {
            id: `full-width-tab-${index}`,
            'aria-controls': `full-width-tabpanel-${index}`,
        };
    }

    ///////////////////////////////////////// IP setting /////////////////////////////////////////
    private checkNetworkState = (str: string) => {
        this.networkManager.isReachableURL(store.getState().DART_MONITORING_PAGES).then((result) => {
            result = true; // kdg
            this.setState({
                ...this.state,
                connectionState: result ? this.CONNECTION_STATE.CONNECTED : this.CONNECTION_STATE.NOT_CONNECTED,
            });
            store.dispatch(
                setConnectionState(result ? this.CONNECTION_STATE.CONNECTED : this.CONNECTION_STATE.NOT_CONNECTED),
            );
            this.forceUpdate();
            if (str == 'setclick') {
                store.dispatch(setStateIp(result ? true : false));
                this.setState({
                    state_ip: result ? true : false,
                });
                this.UiUpdate(str);
                IPSet(result);
                if (result) {
                    this.PortTestRunDRL(2);
                }
            } else if (str == 'iframeclick') {
            }
        });
    };
    onChangeURL = (num: number) => (e: any) => {
        const newIp = store.getState().ip;
        newIp[num] = parseInt(e.target.value);
        if (isNaN(newIp[num])) {
            newIp[num] = 0;
        } else if (newIp[num] > 255) {
            newIp[num] = 255;
        } else if (newIp[num] < 0) {
            newIp[num] = 0;
        }
        store.dispatch(setIp(newIp));
        store.dispatch(setDns(`http://${newIp[0]}.${newIp[1]}.${newIp[2]}.${newIp[3]}/`));
        this.setState({
            ip: newIp,
            DART_MONITORING_DNS: store.getState().DART_MONITORING_DNS,
        });
        const tabs = document.querySelectorAll(`.${styles['link-btn-wrapper']} Button`);
        tabs.forEach((tab) => {
            tab.disabled = false;
        });
    };
    SetClick = async () => {
        const servo_check = this.ServoOnCheck();
        if (!servo_check) {
            return;
        }
        const drl_run_check = await this.DrlRunCheck();
        if (drl_run_check) {
            return;
        }
        this.setState(
            {
                DART_MONITORING_PAGES: store.getState().DART_MONITORING_DNS + 'solutions',
            },
            () => {
                const dns = store.getState().DART_MONITORING_DNS + 'solutions';
                store.dispatch(setClick(dns));
                console.log('### ' + String(dns));
                this.checkNetworkState('setclick');
            },
        );
        this.setState({
            port: store.getState().port,
        });
    };
    UnsetClick = () => {
        this.setState({
            connectionState: this.CONNECTION_STATE.NOT_CONNECTED,
        });
        store.dispatch(unsetClick(this.CONNECTION_STATE.NOT_CONNECTED));
        this.UiUpdate('unsetclick');
        this.UiUpdate('rssportapplyoff');
        this.UiUpdate('bpsportapplyoff');
        this.UiUpdate('rssportresetoff');
        this.UiUpdate('bpsportresetoff');
        this.DrlRunStop();
        IPUnset();
    };
    IframeBtnClick = (num: number) => {
        let tmp = '';
        const variable = [...this.state.iframe_btn_click];
        for (let i = 0; i < 4; i++) {
            if (i == num) {
                variable[i] = 'info';
            } else {
                variable[i] = 'secondary';
            }
        }
        this.setState({
            iframe_btn_click: variable,
        });
        switch (num) {
            case 0:
                tmp = 'pages/main';
                break;
            case 1:
                tmp = 'solutions';
                break;
            case 2:
                tmp = 'network';
                break;
            case 3:
                tmp = 'deployment';
                break;
        }
        this.setState(
            {
                DART_MONITORING_PAGES: store.getState().DART_MONITORING_DNS + tmp,
            },
            () => {
                store.dispatch(iframeBtnClick(store.getState().DART_MONITORING_DNS + tmp));
                this.checkNetworkState('iframeclick');
            },
        );
    };

    ///////////////////////////////////////// TCP/IP Port /////////////////////////////////////////

    PortTestRunDRL = async (num: number) => {
        const servo_check = this.ServoOnCheck();
        if (!servo_check) {
            return;
        }
        const drl_run_check = await this.DrlRunCheck();
        if (drl_run_check) {
            return;
        }
        const monitoringVar: MonitoringVariable[] = [];
        if (num === 0) {
            // Robot State Server Port
            monitoringVar.push({
                data: 'False',
                division: 1,
                name: 'result_RobotStateServer',
                type: 0,
            });
        } else if (num === 1) {
            // Bin Picking Client Port
            monitoringVar.push({
                data: 'False',
                division: 1,
                name: 'result_BinPickingClient',
                type: 0,
            });
        } else if (num === 2) {
            // all
            monitoringVar.push({
                data: 'False',
                division: 1,
                name: 'result_RobotStateServer',
                type: 0,
            });
            monitoringVar.push({
                data: 'False',
                division: 1,
                name: 'result_BinPickingClient',
                type: 0,
            });
        }

        // drl input variable
        var DRL_tmp = DRL_port_test;
        var RSS_port_tmp = store.getState().port[0];
        var BPS_port_tmp = store.getState().port[1];
        var ip_tmp =
            String(store.getState().ip[0]) +
            '.' +
            String(store.getState().ip[1]) +
            '.' +
            String(store.getState().ip[2]) +
            '.' +
            String(store.getState().ip[3]);
        var DRL_input_var = `
STATE_SRV_PORT = ${JSON.stringify(RSS_port_tmp) + '\r'}
BINPICKING_SRV_PORT = ${JSON.stringify(BPS_port_tmp) + '\r'}
BINPICKING_SRV_IP = ${JSON.stringify(ip_tmp) + '\r'}`;
        DRL_tmp = DRL_input_var + DRL_tmp;
        if (num === 0) {
            // Robot State Server Port
            DRL_tmp += DRL_port_test_RSS;
            this.programManager.monitoringVariables.register(this.moduleContext, this.PortRSSCallback);
        } else if (num === 1) {
            // Bin Picking Client Port
            DRL_tmp += DRL_port_test_BPS;
            this.programManager.monitoringVariables.register(this.moduleContext, this.PortBPSCallback);
        } else if (num === 2) {
            // all
            DRL_tmp += DRL_port_test_ALL;
            this.programManager.monitoringVariables.register(this.moduleContext, this.PortAllCallback);
        }
        const unregistVariableMonitor = (programState: ProgramState) => {
            if (programState !== ProgramState.STOP) return;
            this.programManager.monitoringVariables.unregister(this.moduleContext, this.PortRSSCallback);
            this.programManager.monitoringVariables.unregister(this.moduleContext, this.PortBPSCallback);
            this.programManager.monitoringVariables.unregister(this.moduleContext, this.PortAllCallback);
            this.programManager.programState.unregister(this.moduleContext, unregistVariableMonitor);
            if (num == 0) {
                if (store.getState().port[0] != this.default_port[0]) {
                    this.UiUpdate('rssportreseton');
                }
            } else if (num == 1) {
                if (store.getState().port[1] != this.default_port[1]) {
                    this.UiUpdate('bpsportreseton');
                }
            } else if (num == 2) {
                if (store.getState().port[0] != this.default_port[0]) {
                    this.UiUpdate('rssportreseton');
                }
                if (store.getState().port[1] != this.default_port[1]) {
                    this.UiUpdate('bpsportreseton');
                }
            }
        };
        this.programManager.programState.register(this.moduleContext, unregistVariableMonitor.bind(num));
        this.programManager
            .runProgram(DRL_tmp, null, monitoringVar, false)
            .then((result) => {
                if (result) {
                    logger.info('Successfully run program.');
                } else {
                    logger.warn(`Failed to run program.`);
                }
            })
            .catch((e: Error) => {
                logger.warn(`Failed to run program by ${e}.`);
            });
    };
    onChangePort = (num: number) => (e: any) => {
        const newPort = store.getState().port;
        newPort[num] = parseInt(e.target.value);
        if (isNaN(newPort[num])) {
            newPort[num] = 0;
        } else if (newPort[num] > 65535) {
            newPort[num] = 65535;
        } else if (newPort[num] < 0) {
            newPort[num] = 0;
        }
        store.dispatch(setPort(newPort));
        this.setState({
            port: newPort,
        });
        if (num == 0) {
            this.UiUpdate('rssportapplyon');
            if (newPort[num] != this.default_port[num]) {
                this.UiUpdate('rssportreseton');
            }
        }
        if (num == 1) {
            this.UiUpdate('bpsportapplyon');
            if (newPort[num] != this.default_port[num]) {
                this.UiUpdate('bpsportreseton');
            }
        }
    };
    portApplyClick = async (num: number) => {
        const servo_check = this.ServoOnCheck();
        if (!servo_check) {
            return;
        }
        const drl_run_check = await this.DrlRunCheck();
        if (drl_run_check) {
            return;
        }
        const tmp1 = document.getElementById('txtfield_port1');
        const tmp2 = document.getElementById('txtfield_port2');
        const tmp = [tmp1, tmp2];
        const newport = store.getState().port;
        newport[num] = parseInt(tmp[num].value);
        store.dispatch(setPort(newport));
        this.PortTestRunDRL(num);
        if (num == 0) {
            this.UiUpdate('rssportapplyoff');
        } else if (num == 1) {
            this.UiUpdate('bpsportapplyoff');
        }
    };
    portResetClick = (num: number) => {
        const tmp1 = document.getElementById('txtfield_port1');
        const tmp2 = document.getElementById('txtfield_port2');
        const newPort = store.getState().port;
        if (num == 0) {
            if (tmp1) {
                tmp1.value = 11004;
                newPort[num] = parseInt(tmp1.value);
            }
        }
        if (num == 1) {
            if (tmp2) {
                tmp2.value = 11003;
                newPort[num] = parseInt(tmp2.value);
            }
        }
        store.dispatch(setPort(newPort));
        if (num == 0) {
            this.UiUpdate('rssportapplyon');
            this.UiUpdate('rssportresetoff');
        } else if (num == 1) {
            this.UiUpdate('bpsportapplyon');
            this.UiUpdate('bpsportresetoff');
        }
    };
    PortAllCallback = (variable: MonitoringVariable[]) => {
        if (variable[0].data == 'True') {
            const newtcp = store.getState().state_tcp;
            newtcp[0] = true;
            store.dispatch(setStateTcp(newtcp));
            this.setState({
                state_tcp: newtcp,
            });
        }
        if (variable[1].data == 'True') {
            const newtcp = store.getState().state_tcp;
            newtcp[1] = true;
            store.dispatch(setStateTcp(newtcp));
            this.setState({
                state_tcp: newtcp,
            });
        }

        // kdg
        const newtcp = [true, true];
        store.dispatch(setStateTcp(newtcp));
        this.setState({
            state_tcp: newtcp,
        });
        this.UiUpdate('portallcallback');
    };
    PortRSSCallback = (variable: MonitoringVariable[]) => {
        const newtcp = store.getState().state_tcp;
        if (variable[0].data == 'True') {
            newtcp[0] = true;
        } else {
            newtcp[0] = false;
        }
        store.dispatch(setStateTcp(newtcp));
        this.setState({
            state_tcp: newtcp,
        });
        this.UiUpdate('portrsscallback');
    };
    PortBPSCallback = (variable: MonitoringVariable[]) => {
        const newtcp = store.getState().state_tcp;
        if (variable[0].data == 'True') {
            newtcp[1] = true;
        } else {
            newtcp[1] = false;
        }
        store.dispatch(setStateTcp(newtcp));
        this.setState({
            state_tcp: newtcp,
        });
        this.UiUpdate('portbpscallback');
    };
    UiUpdate = (str: string) => {
        const state_ip = store.getState().state_ip;
        const state_tcp = store.getState().state_tcp;
        const icon_state_ip = document.getElementById('state_ip');
        const icon_state_port1 = document.getElementById('state_port1');
        const icon_state_port2 = document.getElementById('state_port2');
        switch (str) {
            case 'init':
                break;
            case 'setclick':
                if (state_ip) {
                    if (icon_state_ip) {
                        icon_state_ip.classList.remove(styles['disabled']);
                        icon_state_ip.classList.remove(styles['error']);
                        icon_state_ip.classList.add(styles['success']);
                    }
                } else {
                    store.dispatch(setStateIp(false));
                    store.dispatch(setStateTcp([false, false]));
                    store.dispatch(setStateCali(false));
                    store.dispatch(setStateSol(false));
                    this.setState({
                        state_ip: false,
                        state_tcp: [false, false],
                        state_cali: false,
                        state_sol: false,
                    });
                    if (icon_state_ip) {
                        icon_state_ip.classList.remove(styles['disabled']);
                        icon_state_ip.classList.add(styles['error']);
                        icon_state_ip.classList.remove(styles['success']);
                    }
                }
                break;
            case 'iframeclick':
                break;
            case 'unsetclick':
                store.dispatch(setStateIp(false));
                store.dispatch(setStateTcp([false, false]));
                store.dispatch(setStateCali(false));
                store.dispatch(setStateSol(false));
                this.setState({
                    state_ip: false,
                    state_tcp: [false, false],
                    state_cali: false,
                    state_sol: false,
                });
                if (icon_state_ip) {
                    icon_state_ip.classList.add(styles['disabled']);
                    icon_state_ip.classList.remove(styles['error']);
                    icon_state_ip.classList.remove(styles['success']);
                }
                if (icon_state_port1) {
                    icon_state_port1.classList.add(styles['disabled']);
                    icon_state_port1.classList.remove(styles['error']);
                    icon_state_port1.classList.remove(styles['success']);
                }
                if (icon_state_port2) {
                    icon_state_port2.classList.add(styles['disabled']);
                    icon_state_port2.classList.remove(styles['error']);
                    icon_state_port2.classList.remove(styles['success']);
                }
                break;
            case 'portallcallback':
                if (state_tcp[0] == true) {
                    if (icon_state_port1) {
                        icon_state_port1.classList.remove(styles['disabled']);
                        icon_state_port1.classList.remove(styles['error']);
                        icon_state_port1.classList.add(styles['success']);
                    }
                } else {
                    if (icon_state_port1) {
                        icon_state_port1.classList.remove(styles['disabled']);
                        icon_state_port1.classList.add(styles['error']);
                        icon_state_port1.classList.remove(styles['success']);
                    }
                }
                if (state_tcp[1] == true) {
                    if (icon_state_port2) {
                        icon_state_port2.classList.remove(styles['disabled']);
                        icon_state_port2.classList.remove(styles['error']);
                        icon_state_port2.classList.add(styles['success']);
                    }
                } else {
                    if (icon_state_port2) {
                        icon_state_port2.classList.remove(styles['disabled']);
                        icon_state_port2.classList.add(styles['error']);
                        icon_state_port2.classList.remove(styles['success']);
                    }
                }
                break;
            case 'portrsscallback':
                if (state_tcp[0] == true) {
                    if (icon_state_port1) {
                        icon_state_port1.classList.remove(styles['disabled']);
                        icon_state_port1.classList.remove(styles['error']);
                        icon_state_port1.classList.add(styles['success']);
                    }
                } else {
                    if (icon_state_port1) {
                        icon_state_port1.classList.remove(styles['disabled']);
                        icon_state_port1.classList.add(styles['error']);
                        icon_state_port1.classList.remove(styles['success']);
                    }
                }
                break;
            case 'portbpscallback':
                if (state_tcp[1] == true) {
                    if (icon_state_port2) {
                        icon_state_port2.classList.remove(styles['disabled']);
                        icon_state_port2.classList.remove(styles['error']);
                        icon_state_port2.classList.add(styles['success']);
                    }
                } else {
                    if (icon_state_port2) {
                        icon_state_port2.classList.remove(styles['disabled']);
                        icon_state_port2.classList.add(styles['error']);
                        icon_state_port2.classList.remove(styles['success']);
                    }
                }
                break;
            case 'rssportapplyon':
                this.setState({
                    tcp_btn_rss_apply: true,
                });
                break;
            case 'bpsportapplyon':
                this.setState({
                    tcp_btn_bps_apply: true,
                });
                break;
            case 'rssportreseton':
                this.setState({
                    tcp_btn_rss_reset: true,
                });
                break;
            case 'bpsportreseton':
                this.setState({
                    tcp_btn_bps_reset: true,
                });
                break;
            case 'rssportapplyoff':
                this.setState({
                    tcp_btn_rss_apply: false,
                });
                break;
            case 'bpsportapplyoff':
                this.setState({
                    tcp_btn_bps_apply: false,
                });
                break;
            case 'rssportresetoff':
                this.setState({
                    tcp_btn_rss_reset: false,
                });
                break;
            case 'bpsportresetoff':
                this.setState({
                    tcp_btn_bps_reset: false,
                });
                break;
        }
    };
    ServoOnCheck = () => {
        const result = this.robotManager?.isServoOn();
        if (!result) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_007, true);
        }
        return result;
    };
    DrlRunCheck = async () => {
        const result = await this.programManager?.getProgramState(); // 0:none 1:play 2:stop 3:hold
        if (result != 0) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_008, true);
            return true;
        } else {
            return false;
        }
    };
    DrlRunStop = async () => {
        const result = await this.programManager?.getProgramState(); // 0:none 1:play 2:stop 3:hold
        if (result != 0) {
            this.programManager?.stopProgram(ProgramStopType.QUICK);
        }
    };
    render() {
        return (
            <ThemeProvider theme={this.systemTheme}>
                <Provider store={store}>
                    <div className={styles['vision-photoneo-container']}>
                        <div className={styles['vision-photoneo-wrapper']}>
                            <div className={styles['left-container']}>
                                <div className={styles['ip-address-port-wrapper']}>
                                    <FormControl
                                        className={`${styles['ip-address-port-wrap']} ${styles['ip-address']}`}
                                    >
                                        <div className={styles['status-wrapper']}>
                                            <StatusIcon
                                                id="state_ip"
                                                className={`${styles['status-icon']} ${styles['disabled']}`}
                                            />
                                            <FormLabel>{messages.ip_address}</FormLabel>
                                        </div>
                                        <FormGroup row={true}>
                                            <TextField
                                                value={this.state.ip[0]}
                                                type={'number'}
                                                size={'small'}
                                                disabled={this.state.state_ip}
                                                onChange={this.onChangeURL(0)}
                                            />
                                            <TextField
                                                value={this.state.ip[1]}
                                                type={'number'}
                                                size={'small'}
                                                disabled={this.state.state_ip}
                                                onChange={this.onChangeURL(1)}
                                            />
                                            <TextField
                                                value={this.state.ip[2]}
                                                type={'number'}
                                                size={'small'}
                                                disabled={this.state.state_ip}
                                                onChange={this.onChangeURL(2)}
                                            />
                                            <TextField
                                                value={this.state.ip[3]}
                                                type={'number'}
                                                size={'small'}
                                                disabled={this.state.state_ip}
                                                onChange={this.onChangeURL(3)}
                                            />
                                        </FormGroup>
                                    </FormControl>
                                    <div className={styles['set-btn-wrapper']}>
                                        <Button
                                            id="btn_set"
                                            onClick={() => this.SetClick()}
                                            disabled={this.state.state_ip}
                                            color={'primary'}
                                            className={styles['set-btn']}
                                        >
                                            {messages.btn_set}
                                        </Button>
                                        <Button
                                            id="btn_unset"
                                            onClick={() => this.UnsetClick()}
                                            disabled={!this.state.state_ip}
                                            color={'secondary'}
                                            className={styles['set-btn']}
                                        >
                                            {messages.btn_unset}
                                        </Button>
                                    </div>
                                </div>

                                <div className={styles['photoneo-iframe']}>
                                    <iframe
                                        id="monitoring"
                                        key={this.state.DART_MONITORING_PAGES}
                                        src={this.state.DART_MONITORING_PAGES}
                                        hidden={this.state.connectionState !== this.CONNECTION_STATE.CONNECTED}
                                    />
                                </div>
                                <div className={styles['link-btn-wrapper']}>
                                    <Button
                                        onClick={() => this.IframeBtnClick(0)}
                                        id="btn_document"
                                        disabled={!this.state.state_ip}
                                        color={this.state.iframe_btn_click[0]}
                                        size={'small'}
                                        className={styles['link-btn']}
                                    >
                                        {' '}
                                        {messages.iframe_btn_001}
                                    </Button>
                                    <Button
                                        onClick={() => this.IframeBtnClick(1)}
                                        id="btn_solution"
                                        disabled={!this.state.state_ip}
                                        color={this.state.iframe_btn_click[1]}
                                        size={'small'}
                                        className={styles['link-btn']}
                                    >
                                        {' '}
                                        {messages.iframe_btn_002}
                                    </Button>
                                    <Button
                                        onClick={() => this.IframeBtnClick(2)}
                                        id="btn_network"
                                        disabled={!this.state.state_ip}
                                        color={this.state.iframe_btn_click[2]}
                                        size={'small'}
                                        className={styles['link-btn']}
                                    >
                                        {' '}
                                        {messages.iframe_btn_003}
                                    </Button>
                                    <Button
                                        onClick={() => this.IframeBtnClick(3)}
                                        id="btn_deployment"
                                        disabled={!this.state.state_ip}
                                        color={this.state.iframe_btn_click[3]}
                                        size={'small'}
                                        className={styles['link-btn']}
                                    >
                                        {messages.iframe_btn_004}
                                    </Button>
                                </div>
                            </div>
                            <div className={styles['right-container']}>
                                <FormControl disabled={!this.state.state_ip} className={styles['tcp-ip-port-contents']}>
                                    <FormLabel>{messages.calibration_option_title_001}</FormLabel>
                                    <div className={styles['tcp-ip-port-wrapper']}>
                                        <div className={styles['tcp-ip-port-wrap']}>
                                            <span className={styles['port-group-input']}>
                                                <div className={styles['status-wrapper']}>
                                                    <StatusIcon
                                                        id="state_port1"
                                                        className={`${styles['status-icon']} ${styles['disabled']}`}
                                                    />
                                                    <FormLabel>{messages.port_label_001}</FormLabel>
                                                </div>
                                                <TextField
                                                    id="txtfield_port1"
                                                    value={this.state.port[0]}
                                                    disabled={!this.state.state_ip}
                                                    size={'small'}
                                                    onChange={this.onChangePort(0)}
                                                />
                                            </span>
                                            <span className={styles['port-group-btn']}>
                                                <Button
                                                    id="btn_port1_apply"
                                                    onClick={() => this.portApplyClick(0)}
                                                    disabled={!this.state.tcp_btn_rss_apply}
                                                    color={'secondary'}
                                                >
                                                    {messages.btn_apply}
                                                </Button>
                                                <Button
                                                    id="btn_port1_reset"
                                                    onClick={() => this.portResetClick(0)}
                                                    disabled={!this.state.tcp_btn_rss_reset}
                                                    color={'secondary'}
                                                >
                                                    <IcnReset />
                                                </Button>
                                            </span>
                                        </div>
                                        <Divider variant={'fullWidth'} />
                                        <div className={styles['tcp-ip-port-wrap']}>
                                            <span className={styles['port-group-input']}>
                                                <div className={styles['status-wrapper']}>
                                                    <StatusIcon
                                                        id="state_port2"
                                                        className={`${styles['status-icon']} ${styles['disabled']}`}
                                                    />
                                                    <FormLabel>{messages.port_label_002}</FormLabel>
                                                </div>
                                                <TextField
                                                    id="txtfield_port2"
                                                    value={this.state.port[1]}
                                                    disabled={!this.state.state_ip}
                                                    size={'small'}
                                                    onChange={this.onChangePort(1)}
                                                />
                                            </span>
                                            <span className={styles['port-group-btn']}>
                                                <Button
                                                    id="btn_port2_apply"
                                                    onClick={() => this.portApplyClick(1)}
                                                    disabled={!this.state.tcp_btn_bps_apply}
                                                    color={'secondary'}
                                                >
                                                    {messages.btn_apply}
                                                </Button>
                                                <Button
                                                    id="btn_port2_reset"
                                                    onClick={() => this.portResetClick(1)}
                                                    disabled={!this.state.tcp_btn_bps_reset}
                                                    color={'secondary'}
                                                >
                                                    <IcnReset />
                                                </Button>
                                            </span>
                                        </div>
                                    </div>
                                </FormControl>
                                <Divider variant={'fullWidth'} />
                                <div className={styles['tabs-wrapper']}>
                                    <Tabs
                                        className={styles['option-tabs']}
                                        variant={'fullWidth'}
                                        value={this.state.value}
                                        onChange={this.handleChange}
                                    >
                                        <Tab
                                            disabled={!this.state.state_ip}
                                            label={messages.tab_title_001}
                                            {...this.a11yProps(0)}
                                        />
                                        <Tab
                                            disabled={!this.state.state_ip}
                                            label={messages.tab_title_002}
                                            {...this.a11yProps(1)}
                                        />
                                    </Tabs>
                                    <TabPanel value={this.state.value} index={0}>
                                        <Calibration moduleContext={this.moduleContext} />
                                    </TabPanel>
                                    <TabPanel value={this.state.value} index={1}>
                                        <Solutions moduleContext={this.moduleContext} />
                                    </TabPanel>
                                </div>
                            </div>
                        </div>
                    </div>
                </Provider>
            </ThemeProvider>
        );
    }
}
