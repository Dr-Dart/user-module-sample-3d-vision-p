import { DialogBuilder, DialogInterface, ModuleContext, logger, MonitoringVariable, ProgramState, IRobotManager, IToast, Toast, ProgramStopType } from "dart-api";
import React from 'react';
import { ThemeProvider, Button, FormLabel, TextField, FormControl, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Table, TableCell, TableBody, TableContainer, TableRow, TableHead, LinearProgress } from "@mui/material";
import styles from "../assets/styles/styles.scss";
import IcnGetPose from "../assets/images/icon_get_pose.svg";
import IcnMoveTo from "../assets/images/icon_move_to.svg";
import IcnReset from "../assets/images/icon_reset.svg";
import StatusIcon from "../assets/images/status_icon_circle.svg";

import { RobotSpace, Context, IPositionManager, IMotionManager, IProgramManager, SixNumArray, StopType, IRobotParameterManager } from "dart-api";
import { useState, useEffect, useRef } from 'react';
import { DRL_Validation_run } from "../drl/drl"

import store, {
    setStartpose,
    setEndpose,
    setJointMax,
    setJointMin
} from '../reducers'
import { useSelector } from 'react-redux'
import { messages } from '../messages'

declare module "@mui/material/Button" {
    interface ButtonPropsVariantOverrides {
        longPressed: true;
    }
}

function ValidationCallback(variable: MonitoringVariable[]) {
    const [tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7] = [
        "state_val1",
        "state_val2",
        "state_val3",
        "state_val4",
        "state_val5",
        "state_val6",
        "state_val7"
    ].map((id) => document.getElementById(id));

    const result = JSON.parse(String(variable[0].data)) as number[];

    [tmp1, tmp2, tmp3, tmp4, tmp5, tmp6, tmp7].forEach((tmp, index) => {
        if (result[index] === 0) {
            tmp?.classList.remove(styles["error"]);
            tmp?.classList.add(styles["success"]);
        } else {
            const code_tmp = document.getElementById(`code_val${index + 1}`);
            tmp?.classList.add(styles["error"]);
            tmp?.classList.remove(styles["success"]);
            if (code_tmp) {
                code_tmp.textContent = result[index].toString().padStart(5, "0");
            }
        }
    });
}

function dialog_vali_running(context: ModuleContext, drlstopfunction) {
    const { packageName } = context;

    const result = new DialogBuilder(context)
        .setIcon(DialogInterface.ICON_INFO)
        .setTitle(messages.dialog_title_004)
        .setMessage(messages.dialog_message_006)
        .setContentView(<ValidationResult moduleContext={context} />)
        .setButton(DialogInterface.BUTTON_POSITIVE, messages.btn_confirm, true, {
            onClick: (dialog: DialogInterface) => {
                dialog.dismiss()
                drlstopfunction(context)
            }
        })
    return result
}


function ValidationResult(props: { moduleContext: ModuleContext }) {
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    return (
        <ThemeProvider theme={moduleContext.systemTheme}>
            <div className={styles["vision-dialog"]}>
                <TableContainer className={styles["validation-result"]}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{messages.dialog_table_header_001}</TableCell>
                                <TableCell>{messages.dialog_table_header_002}</TableCell>
                                <TableCell>{messages.dialog_table_header_003}</TableCell>
                                <TableCell>{messages.dialog_table_header_004}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                <TableCell>1</TableCell>
                                <TableCell>{messages.dialog_table_body_001}</TableCell>
                                <TableCell><StatusIcon id='state_val1' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val1'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>2</TableCell>
                                <TableCell>{messages.dialog_table_body_002}</TableCell>
                                <TableCell><StatusIcon id='state_val2' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val2'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>3</TableCell>
                                <TableCell>{messages.dialog_table_body_003}</TableCell>
                                <TableCell><StatusIcon id='state_val3' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val3'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>4</TableCell>
                                <TableCell>{messages.dialog_table_body_004}</TableCell>
                                <TableCell><StatusIcon id='state_val4' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val4'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>5</TableCell>
                                <TableCell>{messages.dialog_table_body_005}</TableCell>
                                <TableCell><StatusIcon id='state_val5' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val5'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>6</TableCell>
                                <TableCell>{messages.dialog_table_body_006}</TableCell>
                                <TableCell><StatusIcon id='state_val6' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val6'>00000</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>7</TableCell>
                                <TableCell>{messages.dialog_table_body_007}</TableCell>
                                <TableCell><StatusIcon id='state_val7' className={styles["error"]} /></TableCell>
                                <TableCell id='code_val7'>00000</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </div>
        </ThemeProvider>
    )
}

export default function SolutionTest(props: { moduleContext: ModuleContext }) {
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    const positionManager = props.moduleContext.getSystemManager(Context.POSITION_MANAGER) as IPositionManager;
    const motionManager = props.moduleContext.getSystemManager(Context.MOTION_MANAGER) as IMotionManager;
    const programManager = props.moduleContext.getSystemManager(Context.PROGRAM_MANAGER) as IProgramManager;
    const robotManager = props.moduleContext.getSystemManager(Context.ROBOT_MANAGER) as IRobotManager;
    const robotparameterManager = props.moduleContext.getSystemManager(Context.ROBOT_PARAMETER_MANAGER) as IRobotParameterManager;

    const startpose = useSelector(state=>state.startpose)
    const endpose = useSelector(state=>state.endpose)
    const setposes = [setStartpose, setEndpose];

    const state_ip = useSelector(state => state.state_ip)
    const state_tcp = useSelector(state => state.state_tcp)

    const refDialogValiRunning = useRef<DialogInterface>();
    const refValiStop = useRef<boolean>(false);

    const [intervalId, setIntervalId] = useState<number>(0);

    useEffect(() => {
        const tmp1 = document.getElementById("startpose_j1");
        const tmp2 = document.getElementById("startpose_j2");
        const tmp3 = document.getElementById("startpose_j3");
        const tmp4 = document.getElementById("startpose_j4");
        const tmp5 = document.getElementById("startpose_j5");
        const tmp6 = document.getElementById("startpose_j6");

        if (tmp1) {
            tmp1.value = startpose[0];
        }
        if (tmp2) {
            tmp2.value = startpose[1];
        }
        if (tmp3) {
            tmp3.value = startpose[2];
        }
        if (tmp4) {
            tmp4.value = startpose[3];
        }
        if (tmp5) {
            tmp5.value = startpose[4];
        }
        if (tmp6) {
            tmp6.value = startpose[5];
        }
    }, [startpose]);
    useEffect(() => {
        const tmp1 = document.getElementById("endpose_j1");
        const tmp2 = document.getElementById("endpose_j2");
        const tmp3 = document.getElementById("endpose_j3");
        const tmp4 = document.getElementById("endpose_j4");
        const tmp5 = document.getElementById("endpose_j5");
        const tmp6 = document.getElementById("endpose_j6");

        if (tmp1) {
            tmp1.value = endpose[0];
        }
        if (tmp2) {
            tmp2.value = endpose[1];
        }
        if (tmp3) {
            tmp3.value = endpose[2];
        }
        if (tmp4) {
            tmp4.value = endpose[3];
        }
        if (tmp5) {
            tmp5.value = endpose[4];
        }
        if (tmp6) {
            tmp6.value = endpose[5];
        }
    }, [endpose]);

    function onBlurJoint(num: number) {
        const jointlimitmax = store.getState().jointmax
        const jointlimitmin = store.getState().jointmin
        const robotmodel = robotManager.getRobotModel()
        const robotparam = robotparameterManager.getRobotLimit(robotmodel);

        var maxflag = 0
        var minflag = 0
        jointlimitmax.forEach((value, index) => {
            if (value != robotparam.jointAngle.maxRange[index]) {
                jointlimitmax[index] = robotparam.jointAngle.maxRange[index]
            }
        })
        jointlimitmin.forEach((value, index) => {
            if (value != robotparam.jointAngle.minRange[index]) {
                jointlimitmin[index] = robotparam.jointAngle.minRange[index]
            }
        })
        if (maxflag) {
            store.dispatch(setJointMax(jointlimitmax))
        }
        if (minflag) {
            store.dispatch(setJointMin(jointlimitmin))
        }

        var idPrefix = `startpose_j`;
        if (num == 1) {
            idPrefix = `endpose_j`
        }
        const tmp1 = document.getElementById(`${idPrefix}1`);
        const tmp2 = document.getElementById(`${idPrefix}2`);
        const tmp3 = document.getElementById(`${idPrefix}3`);
        const tmp4 = document.getElementById(`${idPrefix}4`);
        const tmp5 = document.getElementById(`${idPrefix}5`);
        const tmp6 = document.getElementById(`${idPrefix}6`);

        const arrtmp: number[] = [
            parseFloat(tmp1?.value || '0'),
            parseFloat(tmp2?.value || '0'),
            parseFloat(tmp3?.value || '0'),
            parseFloat(tmp4?.value || '0'),
            parseFloat(tmp5?.value || '0'),
            parseFloat(tmp6?.value || '0')
        ].map((value, index) => {
            const minValue = jointlimitmin[index];
            const maxValue = jointlimitmax[index];

            if (value < minValue) {
                return minValue;
            }

            if (value > maxValue) {
                return maxValue;
            }

            return value;
        });
        store.dispatch(setposes[num](arrtmp));
    };

    function GetPoseClick(num: number) {
        positionManager.getCurrentPos(RobotSpace.JOINT).then((pos) => {
            const tmp: number[] = pos.map((num) => Number(num.toFixed(2)));
            store.dispatch(setposes[num](tmp))
        });
    }

    function MoveJointH2RPressed0() {
        const num = 0
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        var idPrefix = `startpose_j`;
        const tmp1 = document.getElementById(`${idPrefix}1`);
        const tmp2 = document.getElementById(`${idPrefix}2`);
        const tmp3 = document.getElementById(`${idPrefix}3`);
        const tmp4 = document.getElementById(`${idPrefix}4`);
        const tmp5 = document.getElementById(`${idPrefix}5`);
        const tmp6 = document.getElementById(`${idPrefix}6`);

        const arrtmp: SixNumArray = [
            parseFloat(tmp1?.value || '0'),
            parseFloat(tmp2?.value || '0'),
            parseFloat(tmp3?.value || '0'),
            parseFloat(tmp4?.value || '0'),
            parseFloat(tmp5?.value || '0'),
            parseFloat(tmp6?.value || '0')
        ];
        store.dispatch(setposes[num](arrtmp))

        stopHold2Run();
        motionManager.moveJointH2R(
            arrtmp,
            store.getState().speed[0],
            store.getState().speed[1],
            0,
            0,
            0,
            0,
        ).then(result => {
            if (result) {
                logger.debug(`moveJointH2R Successful pressed`);
            } else {
                logger.warn("moveJointH2R Fail");
            }
        }).catch(() => {
            logger.error("moveJointH2R Error");
        });
        startHold2Run();;
    }

    function MoveJointH2RPressed1() {
        const num = 1
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        var idPrefix = `endpose_j`;
        const tmp1 = document.getElementById(`${idPrefix}1`);
        const tmp2 = document.getElementById(`${idPrefix}2`);
        const tmp3 = document.getElementById(`${idPrefix}3`);
        const tmp4 = document.getElementById(`${idPrefix}4`);
        const tmp5 = document.getElementById(`${idPrefix}5`);
        const tmp6 = document.getElementById(`${idPrefix}6`);

        const arrtmp: SixNumArray = [
            parseFloat(tmp1?.value || '0'),
            parseFloat(tmp2?.value || '0'),
            parseFloat(tmp3?.value || '0'),
            parseFloat(tmp4?.value || '0'),
            parseFloat(tmp5?.value || '0'),
            parseFloat(tmp6?.value || '0')
        ];
        store.dispatch(setposes[num](arrtmp))

        stopHold2Run();
        motionManager.moveJointH2R(
            arrtmp,
            store.getState().speed[0],
            store.getState().speed[1],
            0,
            0,
            0,
            0,
        ).then(result => {
            if (result) {
                logger.debug(`moveJointH2R Successful pressed`);
            } else {
                logger.warn("moveJointH2R Fail");
            }
        }).catch(() => {
            logger.error("moveJointH2R Error");
        });
        startHold2Run();
    }

    function MoveJointH2RReleased() {
        motionManager.moveStop(StopType.SLOW).then(result => {
            if (!result) {
                logger.warn("Failed to stop jog.");
            }
        }).catch(e => logger.warn(`Failed to stop jog caused by ${e}`));
        stopHold2Run();;
    };

    function stopHold2Run() {
        cancelAnimationFrame(intervalId);
    };

    const startHold2Run = () => {
        let lastTime = 0;
        const h2r = (currentTime: any) => {
            if (currentTime - lastTime > 50) {
                motionManager?.holdToRun();
                lastTime = currentTime;
            }
            setIntervalId(requestAnimationFrame(h2r));
        };
        requestAnimationFrame(h2r);
    };

    function ResetClick(num: number) {
        store.dispatch(setposes[num]([0.00, 0.00, 0.00, 0.00, 0.00, 0.00]))
    }

    const ValidationClick = async () => {
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        const drl_run_check = await DrlRunCheck()
        if (drl_run_check) {
            return;
        }
        refValiStop.current = false

        var DRL_tmp = DRL_Validation_run
        var ip = store.getState().ip
        var ip_tmp = String(ip[0]) + '.' + String(ip[1]) + '.' + String(ip[2]) + '.' + String(ip[3])
        let start_pose = [];
        let end_pose = [];

        let joint_positions = [];
        for (let j = 1; j <= 6; j++) {
            const tmp = document.getElementById(`startpose_j${j}`);
            joint_positions.push(parseFloat(tmp?.value || '0'));
        }
        start_pose.push(`posj(${joint_positions.join(",")})`);

        joint_positions = [];
        for (let j = 1; j <= 6; j++) {
            const tmp = document.getElementById(`endpose_j${j}`);
            joint_positions.push(parseFloat(tmp?.value || '0'));
        }
        end_pose.push(`posj(${joint_positions.join(",")})`);


        var DRL_input_var =
            `vel = ${JSON.stringify(store.getState().speed[0]) + '\r'}
acc = ${JSON.stringify(store.getState().speed[1]) + '\r'}
STATE_SRV_PORT = ${JSON.stringify(store.getState().port[0]) + '\r'}
BINPICKING_SRV_PORT = ${JSON.stringify(store.getState().port[1]) + '\r'}
BINPICKING_SRV_IP = ${JSON.stringify(ip_tmp) + '\r'}
SOLUTION_ID = ${store.getState().sol_id}\r
VS_ID = ${store.getState().vs_id}\r
start_posj = ${start_pose.join(",")}
end_posj = ${end_pose.join(",")}
`
        DRL_tmp = DRL_input_var + DRL_tmp

        const monitoringVar: MonitoringVariable[] = [];
        monitoringVar.push({ data: '[0,0,0,0,0,0,0]', division: 1, name: 'result_message', type: 6 })

        programManager.monitoringVariables.register(props.moduleContext, ValidationCallback);
        const unregistVariableMonitor = (programState: ProgramState) => {
            if (programState !== ProgramState.STOP)
                return;

            programManager.monitoringVariables.unregister(props.moduleContext, ValidationCallback);
            programManager.programState.unregister(props.moduleContext, unregistVariableMonitor);
        }
        programManager.programState.register(props.moduleContext, unregistVariableMonitor);

        programManager.runProgram(DRL_tmp, null, monitoringVar, false)
            .then(result => {
                if (result) {
                    logger.info("Successfully run program.");

                    const dialogvalirunning = dialog_vali_running(moduleContext, DrlRunStop).build()
                    dialogvalirunning.show()
                    refDialogValiRunning.current = dialogvalirunning;
                } else {
                    logger.warn(`Failed to run program.`);
                }
            })
            .catch((e: Error) => {
                logger.warn(`Failed to run program by ${e}.`);
            });
    }

    function ServoOnCheck() {
        const result = robotManager?.isServoOn()
        if (!result) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_007, true);
        }
        return result
    }

    const DrlRunCheck = async () => {
        const result = programManager?.getProgramState() // 0:none 1:play 2:stop 3:hold 
        if (await result != 0) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_008, true);
            return true
        }
        else {
            return false
        }
    }

    const DrlRunStop = async () => {
        const result = await programManager?.getProgramState() // 0:none 1:play 2:stop 3:hold 
        if (result != 0) {
            programManager?.stopProgram(ProgramStopType.QUICK)
        }
        refValiStop.current = true
    }

    return (
        <FormControl disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} className={`${styles["option-contents"]} ${styles["solution-test"]}`}>
            <div className={styles["form-label-wrapper"]}>
                <FormLabel>{messages.solutions_option_title_003}</FormLabel>
            </div>

            {/* Start Pose Start */}
            <Accordion defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_start_pose}</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(0) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed0} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(0) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='startpose_j1' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='startpose_j2' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='startpose_j3' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='startpose_j4' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='startpose_j5' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='startpose_j6' onBlur={() => onBlurJoint(0)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Start Pose End */}

            {/* End Pose Start */}
            <Accordion defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_end_pose}</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(1) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed1} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(1) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='endpose_j1' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='endpose_j2' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='endpose_j3' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='endpose_j4' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='endpose_j5' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='endpose_j6' onBlur={() => onBlurJoint(1)} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* End Pose End */}

            <Button onClick={ValidationClick} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]}>{messages.btn_validation}</Button>
        </FormControl>
    );
}