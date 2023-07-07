import React from 'react';
import { ModuleScreen, ModuleScreenProps, IModuleChannel, Message, logger } from 'dart-api'
import { ThemeProvider, FormControlLabel, TextField, Tabs, Tab } from "@mui/material";
import { DRL_CustomerDefinitions, DRL_main } from './drl/drl';
import { IDartDatabase, Context } from 'dart-api';
const TABLE_PHOTONEO_NAME = 'photoneo';
const TABLE_PHOTONEO_COLUMNS = ['data', 'drl_inputs', 'drl_userdefine', 'drl_main'];
import { Translation } from "react-i18next";
import styles from "./assets/styles/styles.scss";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} {...other}>
            {value === index && (<>{children}</>)}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `full-width-tab-${index}`,
        'aria-controls': `full-width-tabpanel-${index}`,
    };
}

export default class PipScreenForTaskEditor extends ModuleScreen {
    private db: IDartDatabase | null;


    constructor(props: ModuleScreenProps) {
        super(props);
        this.db = this.moduleContext.getSystemLibrary(Context.DART_DATABASE) as IDartDatabase;
        this.state = {
            value: 0,
            inputs: {
                vel: '',
                acc: '',
                STATE_SRV_PORT: '',
                BINPICKING_SRV_PORT: '',
                BINPICKING_SRV_IP: '',
                homepose: '',
                startpose: '',
                endpose: '',
                vsid: '',
            },
            userdefine: '',
            main: ''
        }
        this.onChangeDRL = this.onChangeDRL.bind(this);
    }

    componentDidMount() {
        logger.debug(`componentDidMount: ${this.moduleContext.componentId}`);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.inputs !== prevState.inputs) {
            const ids = ["vel", "acc", "STATE_SRV_PORT", "BINPICKING_SRV_PORT", "BINPICKING_SRV_IP", "homepose", "startpose", "endpose", "vsid"];
            const { inputs } = this.state;
            ids.forEach((id, index) => {
                const tmp = document.getElementById(id);
                if (tmp) {
                    tmp.value = inputs[id];
                }
            });
        }
    }

    onBind(message: Message, channel: IModuleChannel): boolean {
        logger.debug(`PIP Screen onBind: ${this.moduleContext.componentId}, ${JSON.stringify(message)}`);
        this.db?.query(TABLE_PHOTONEO_NAME, TABLE_PHOTONEO_COLUMNS, {}).then((queryResult) => {
            if (queryResult?.length === 0) {

            }
            else {
                if (queryResult[0].data.drl_inputs == "" && queryResult[0].data.drl_userdefine == "" && queryResult[0].data.drl_main == "") {
                    const tmp = JSON.parse(queryResult[0].data.data)
                    var ip_tmp = String(tmp.ip[0]) + '.' + String(tmp.ip[1]) + '.' + String(tmp.ip[2]) + '.' + String(tmp.ip[3])

                    const newData = {
                        ...this.state.inputs,
                        vel: tmp.speed[0],
                        acc: tmp.speed[1],
                        STATE_SRV_PORT: tmp.port[0],
                        BINPICKING_SRV_PORT: tmp.port[1],
                        BINPICKING_SRV_IP: ip_tmp,
                        homepose: tmp.homepose.join(","),
                        startpose: tmp.startpose.join(","),
                        endpose: tmp.endpose.join(","),
                        vsid: tmp.vs_id
                    }

                    this.setState({
                        inputs: newData,
                        userdefine: DRL_CustomerDefinitions,
                        main: DRL_main,
                    });
                    this.db?.update(TABLE_PHOTONEO_NAME, {}, {
                        drl_inputs: JSON.stringify(newData),
                        drl_userdefine: DRL_CustomerDefinitions,
                        drl_main: DRL_main,
                    })
                }
                else {
                    this.setState({ 
                        inputs: JSON.parse(queryResult[0].data.drl_inputs),
                        userdefine: queryResult[0].data.drl_userdefine,
                        main: queryResult[0].data.drl_main,
                    });
                }
            }
        })

        channel.receive('get_current_data', () => {
            const data: Record<string, any> = {};
            data['drl_inputs'] = this.state.inputs;
            data['drl_userdefine'] = this.state.userdefine;
            data['drl_main'] = this.state.main;
            channel.send('get_current_data', data);
        });
        return true;
    }

    onBlurINPUT = (str: string) => (e: any) => {
        const value = e.target.value;
        var newData = {
            ...this.state.inputs
        }
        let tmp;
        switch (str) {
            case 'vel':
                tmp = parseInt(value)
                if (isNaN(tmp)) {
                    tmp = "1"
                }
                else if (tmp < 1) {
                    tmp = "1"
                }
                else if (tmp > 100) {
                    tmp = "100"
                }
                newData.vel = tmp
                break;
            case 'acc':
                tmp = parseInt(value)
                if (isNaN(tmp)) {
                    tmp = "1"
                }
                else if (tmp < 1) {
                    tmp = "1"
                }
                else if (tmp > 100) {
                    tmp = "100"
                }
                newData.acc = tmp
                break;
            case 'STATE_SRV_PORT':
                tmp = parseInt(value)
                if (isNaN(tmp)) {
                    tmp = ""
                }
                else if (tmp < 0) {
                    tmp = "0"
                }
                else if (tmp > 65535) {
                    tmp = "65535"
                }
                newData.STATE_SRV_PORT = tmp
                break;
            case 'BINPICKING_SRV_PORT':
                tmp = parseInt(value)
                if (isNaN(tmp)) {
                    tmp = ""
                }
                else if (tmp < 0) {
                    tmp = "0"
                }
                else if (tmp > 65535) {
                    tmp = "65535"
                }
                newData.BINPICKING_SRV_PORT = tmp
                break;
            case 'BINPICKING_SRV_IP':
                tmp = value
                if (!this.validateIPAddress(tmp)) {
                    tmp = ""
                }
                newData.BINPICKING_SRV_IP = tmp
                break;
            case 'homepose':
                tmp = value
                if (!this.validatePose(tmp)) {
                    tmp = ""
                }
                newData.homepose = tmp
                break;
            case 'startpose':
                tmp = value
                if (!this.validatePose(tmp)) {
                    tmp = ""
                }
                newData.startpose = tmp
                break;
            case 'endpose':
                tmp = value
                if (!this.validatePose(tmp)) {
                    tmp = ""
                }
                newData.endpose = tmp
                break;
            case 'vsid':
                tmp = parseInt(value)
                if (isNaN(tmp)) {
                    tmp = "1"
                }
                else if (tmp < 1) {
                    tmp = "1"
                }
                else if (tmp > 100) {
                    tmp = "100"
                }
                newData.vsid = tmp
                break;
        }
        e.target.value = tmp
        this.setState({
            inputs: newData
        })
        this.db?.update(TABLE_PHOTONEO_NAME, {}, { drl_inputs: JSON.stringify(newData) })
    }

    validateIPAddress(value: string) {
        const ipRegExp = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegExp.test(value);
    }

    validatePose(value: string) {
        const regex = /^-?\d+(\.\d+)?(,-?\d+(\.\d+)?){5}$/;
        return regex.test(value);
    }


    onChangeDRL = (str: string) => (e: any) => {
        const value = e.target.value;
        switch (str) {
            case 'userdefine':
                this.setState({
                    userdefine: value
                })
                this.db?.update(TABLE_PHOTONEO_NAME, {}, { drl_userdefine: value })
                break;
            case 'main':
                this.setState({
                    main: value
                })
                this.db?.update(TABLE_PHOTONEO_NAME, {}, { drl_main: value })
                break;
        }
    };

    handleChange = (event: React.SyntheticEvent, newValue: number) => {
        this.setState({ ...this.state, value: newValue });
    };

    render() {
        return (
            <ThemeProvider theme={this.systemTheme}>
                <Translation>
                    {t =>
                        <div className={styles["pip-photoneo-container"]}>
                            <div className={styles["tabs-wrapper"]}>
                                <Tabs variant={"fullWidth"} value={this.state.value} onChange={this.handleChange}>
                                    <Tab label={"DRL Inputs"} {...a11yProps(0)} />
                                    <Tab label={"Setting"} {...a11yProps(1)} />
                                    <Tab label={"Main Code"} {...a11yProps(2)} />
                                </Tabs>
                                <TabPanel value={this.state.value} index={0}>
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.vel} placeholder="1-100" onBlur={this.onBlurINPUT('vel')} id='vel' size={"small"} />} label={"Velocity"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.acc} placeholder="1-100" onBlur={this.onBlurINPUT('acc')} id='acc' size={"small"} />} label={"Acceleration"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.STATE_SRV_PORT} placeholder="11004" onBlur={this.onBlurINPUT('STATE_SRV_PORT')} id='STATE_SRV_PORT' size={"small"} />} label={"STATE_SRV_PORT"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.BINPICKING_SRV_PORT} placeholder="11003" onBlur={this.onBlurINPUT('BINPICKING_SRV_PORT')} id='BINPICKING_SRV_PORT' size={"small"} />} label={"BINPICKING_SRV_PORT"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.BINPICKING_SRV_IP} placeholder="1.1.1.1" onBlur={this.onBlurINPUT('BINPICKING_SRV_IP')} id='BINPICKING_SRV_IP' size={"small"} />} label={"BINPICKING_SRV_IP"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.homepose} placeholder="0,0,0,0,0,0" onBlur={this.onBlurINPUT('homepose')} id='homepose' size={"small"} />} label={"Home Pose"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.startpose} placeholder="0,0,0,0,0,0" onBlur={this.onBlurINPUT('startpose')} id='startpose' size={"small"} />} label={"Start Pose"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.endpose} placeholder="0,0,0,0,0,0" onBlur={this.onBlurINPUT('endpose')} id='endpose' size={"small"} />} label={"End Pose"} labelPlacement={"start"} />
                                    <FormControlLabel control={<TextField defaultValue={this.state.inputs.vsid} placeholder="1-100" onBlur={this.onBlurINPUT('vsid')} id='vsid' size={"small"} />} label={"Vision System ID"} labelPlacement={"start"} />
                                </TabPanel>
                                <TabPanel value={this.state.value} index={1}>
                                    <TextField multiline={true} fullWidth={true} minRows={24} maxRows={24} value={this.state.userdefine} onChange={this.onChangeDRL('userdefine')} />
                                </TabPanel>
                                <TabPanel value={this.state.value} index={2}>
                                    <TextField multiline={true} fullWidth={true} minRows={24} maxRows={24} value={this.state.main} onChange={this.onChangeDRL('main')} />
                                </TabPanel>
                            </div>
                        </div>
                    }
                </Translation>
            </ThemeProvider>
        )
    }
}