import { DialogBuilder, DialogInterface, ModuleContext, IToast, Toast, ProgramStopType } from "dart-api";
import React from 'react';
import { Button, FormLabel, TextField, FormControl, InputAdornment, Alert, Accordion, AccordionSummary, AccordionDetails, LinearProgress } from "@mui/material";
import styles from "../assets/styles/styles.scss";
import IcnGetPose from "../assets/images/icon_get_pose.svg";
import IcnMoveTo from "../assets/images/icon_move_to.svg";
import IcnReset from "../assets/images/icon_reset.svg";
import IcnPlus from "../assets/images/icon_plus.svg";

import { logger, RobotSpace, Context, IProgramManager, IPositionManager, IMotionManager, IRobotManager, IRobotParameterManager, SixNumArray, MonitoringVariable, ProgramState, StopType } from "dart-api";
import { useState, useEffect, useRef } from 'react';
import { DRL_Calibration_run, DRL_Calibration_add_one_point } from "../drl/drl"

import store, {
    setCalpose1,
    setCalpose2,
    setCalpose3,
    setCalpose4,
    setCalpose5,
    setCalpose6,
    setCalpose7,
    setCalpose8,
    setCalpose9,
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

function dialog_cali_running(context: ModuleContext, drlstopfunction) {
    const { packageName } = context;

    // 진행중일 때,    
    const result = new DialogBuilder(context)
        .setIcon(DialogInterface.ICON_INFO)
        .setTitle(messages.dialog_title_001)
        .setMessage(messages.dialog_message_001)
        .setEmphasisMessage(messages.dialog_message_002)
        .setContentView(
            <div className={styles["vision-dialog"]}>
                <LinearProgress />
            </div>
        )
        .setButton(DialogInterface.BUTTON_NEGATIVE, messages.btn_stop, true, {
            onClick: (dialog: DialogInterface) => {
                dialog.dismiss()
                drlstopfunction(context)
            }
        })
    return result
}

function dialog_cali_fail(context: ModuleContext) {
    const { packageName } = context;
    const result = new DialogBuilder(context)
        .setIcon(DialogInterface.ICON_ERROR)
        .setTitle(messages.dialog_title_002)
        .setMessage(messages.dialog_message_003)
        .setEmphasisMessage(messages.dialog_message_004)
        .setButton(DialogInterface.BUTTON_POSITIVE, messages.btn_confirm, true, {
            onClick: (dialog: DialogInterface) => dialog.dismiss()
        })
    return result
}

function toast_cali_success() {
    Toast.show(IToast.TYPE_SUCCESS, null, messages.toast_message_005, true);
}

export default function CalibrationPose(props: { moduleContext: ModuleContext }) {
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    const positionManager = props.moduleContext.getSystemManager(Context.POSITION_MANAGER) as IPositionManager;
    const motionManager = props.moduleContext.getSystemManager(Context.MOTION_MANAGER) as IMotionManager;
    const programManager = props.moduleContext.getSystemManager(Context.PROGRAM_MANAGER) as IProgramManager;
    const robotManager = props.moduleContext.getSystemManager(Context.ROBOT_MANAGER) as IRobotManager;
    const robotparameterManager = props.moduleContext.getSystemManager(Context.ROBOT_PARAMETER_MANAGER) as IRobotParameterManager;

    const calpose1 = useSelector(state => state.calpose1);
    const calpose2 = useSelector(state => state.calpose2);
    const calpose3 = useSelector(state => state.calpose3);
    const calpose4 = useSelector(state => state.calpose4);
    const calpose5 = useSelector(state => state.calpose5);
    const calpose6 = useSelector(state => state.calpose6);
    const calpose7 = useSelector(state => state.calpose7);
    const calpose8 = useSelector(state => state.calpose8);
    const calpose9 = useSelector(state => state.calpose9);

    const state_ip = useSelector(state => state.state_ip)
    const state_tcp = useSelector(state => state.state_tcp)

    const refDialogCaliRunning = useRef<DialogInterface>();
    const refDialogCaliFail = useRef<DialogInterface>();
    const refStateCali = useRef<boolean>(false);
    const refCaliStop = useRef<boolean>(false);

    const [intervalId, setIntervalId] = useState<number>(0);

    const setcalposes = [
        setCalpose1,
        setCalpose2,
        setCalpose3,
        setCalpose4,
        setCalpose5,
        setCalpose6,
        setCalpose7,
        setCalpose8,
        setCalpose9
    ]

    useEffect(() => { // Calpose1
        const tmp1 = document.getElementById("calpose1_j1");
        const tmp2 = document.getElementById("calpose1_j2");
        const tmp3 = document.getElementById("calpose1_j3");
        const tmp4 = document.getElementById("calpose1_j4");
        const tmp5 = document.getElementById("calpose1_j5");
        const tmp6 = document.getElementById("calpose1_j6");

        if (tmp1) {
            tmp1.value = calpose1[0];
        }
        if (tmp2) {
            tmp2.value = calpose1[1];
        }
        if (tmp3) {
            tmp3.value = calpose1[2];
        }
        if (tmp4) {
            tmp4.value = calpose1[3];
        }
        if (tmp5) {
            tmp5.value = calpose1[4];
        }
        if (tmp6) {
            tmp6.value = calpose1[5];
        }
    }, [calpose1]);

    useEffect(() => { // Calpose2
        const tmp1 = document.getElementById("calpose2_j1");
        const tmp2 = document.getElementById("calpose2_j2");
        const tmp3 = document.getElementById("calpose2_j3");
        const tmp4 = document.getElementById("calpose2_j4");
        const tmp5 = document.getElementById("calpose2_j5");
        const tmp6 = document.getElementById("calpose2_j6");

        if (tmp1) {
            tmp1.value = calpose2[0];
        }
        if (tmp2) {
            tmp2.value = calpose2[1];
        }
        if (tmp3) {
            tmp3.value = calpose2[2];
        }
        if (tmp4) {
            tmp4.value = calpose2[3];
        }
        if (tmp5) {
            tmp5.value = calpose2[4];
        }
        if (tmp6) {
            tmp6.value = calpose2[5];
        }
    }, [calpose2]);

    useEffect(() => { // Calpose3
        const tmp1 = document.getElementById("calpose3_j1");
        const tmp2 = document.getElementById("calpose3_j2");
        const tmp3 = document.getElementById("calpose3_j3");
        const tmp4 = document.getElementById("calpose3_j4");
        const tmp5 = document.getElementById("calpose3_j5");
        const tmp6 = document.getElementById("calpose3_j6");

        if (tmp1) {
            tmp1.value = calpose3[0];
        }
        if (tmp2) {
            tmp2.value = calpose3[1];
        }
        if (tmp3) {
            tmp3.value = calpose3[2];
        }
        if (tmp4) {
            tmp4.value = calpose3[3];
        }
        if (tmp5) {
            tmp5.value = calpose3[4];
        }
        if (tmp6) {
            tmp6.value = calpose3[5];
        }
    }, [calpose3]);

    useEffect(() => { // Calpose4
        const tmp1 = document.getElementById("calpose4_j1");
        const tmp2 = document.getElementById("calpose4_j2");
        const tmp3 = document.getElementById("calpose4_j3");
        const tmp4 = document.getElementById("calpose4_j4");
        const tmp5 = document.getElementById("calpose4_j5");
        const tmp6 = document.getElementById("calpose4_j6");

        if (tmp1) {
            tmp1.value = calpose4[0];
        }
        if (tmp2) {
            tmp2.value = calpose4[1];
        }
        if (tmp3) {
            tmp3.value = calpose4[2];
        }
        if (tmp4) {
            tmp4.value = calpose4[3];
        }
        if (tmp5) {
            tmp5.value = calpose4[4];
        }
        if (tmp6) {
            tmp6.value = calpose4[5];
        }
    }, [calpose4]);

    useEffect(() => { // Calpose5
        const tmp1 = document.getElementById("calpose5_j1");
        const tmp2 = document.getElementById("calpose5_j2");
        const tmp3 = document.getElementById("calpose5_j3");
        const tmp4 = document.getElementById("calpose5_j4");
        const tmp5 = document.getElementById("calpose5_j5");
        const tmp6 = document.getElementById("calpose5_j6");

        if (tmp1) {
            tmp1.value = calpose5[0];
        }
        if (tmp2) {
            tmp2.value = calpose5[1];
        }
        if (tmp3) {
            tmp3.value = calpose5[2];
        }
        if (tmp4) {
            tmp4.value = calpose5[3];
        }
        if (tmp5) {
            tmp5.value = calpose5[4];
        }
        if (tmp6) {
            tmp6.value = calpose5[5];
        }
    }, [calpose5]);

    useEffect(() => { // Calpose6
        const tmp1 = document.getElementById("calpose6_j1");
        const tmp2 = document.getElementById("calpose6_j2");
        const tmp3 = document.getElementById("calpose6_j3");
        const tmp4 = document.getElementById("calpose6_j4");
        const tmp5 = document.getElementById("calpose6_j5");
        const tmp6 = document.getElementById("calpose6_j6");

        if (tmp1) {
            tmp1.value = calpose6[0];
        }
        if (tmp2) {
            tmp2.value = calpose6[1];
        }
        if (tmp3) {
            tmp3.value = calpose6[2];
        }
        if (tmp4) {
            tmp4.value = calpose6[3];
        }
        if (tmp5) {
            tmp5.value = calpose6[4];
        }
        if (tmp6) {
            tmp6.value = calpose6[5];
        }
    }, [calpose6]);

    useEffect(() => { // Calpose7
        const tmp1 = document.getElementById("calpose7_j1");
        const tmp2 = document.getElementById("calpose7_j2");
        const tmp3 = document.getElementById("calpose7_j3");
        const tmp4 = document.getElementById("calpose7_j4");
        const tmp5 = document.getElementById("calpose7_j5");
        const tmp6 = document.getElementById("calpose7_j6");

        if (tmp1) {
            tmp1.value = calpose7[0];
        }
        if (tmp2) {
            tmp2.value = calpose7[1];
        }
        if (tmp3) {
            tmp3.value = calpose7[2];
        }
        if (tmp4) {
            tmp4.value = calpose7[3];
        }
        if (tmp5) {
            tmp5.value = calpose7[4];
        }
        if (tmp6) {
            tmp6.value = calpose7[5];
        }
    }, [calpose7]);

    useEffect(() => { // Calpose8
        const tmp1 = document.getElementById("calpose8_j1");
        const tmp2 = document.getElementById("calpose8_j2");
        const tmp3 = document.getElementById("calpose8_j3");
        const tmp4 = document.getElementById("calpose8_j4");
        const tmp5 = document.getElementById("calpose8_j5");
        const tmp6 = document.getElementById("calpose8_j6");

        if (tmp1) {
            tmp1.value = calpose8[0];
        }
        if (tmp2) {
            tmp2.value = calpose8[1];
        }
        if (tmp3) {
            tmp3.value = calpose8[2];
        }
        if (tmp4) {
            tmp4.value = calpose8[3];
        }
        if (tmp5) {
            tmp5.value = calpose8[4];
        }
        if (tmp6) {
            tmp6.value = calpose8[5];
        }
    }, [calpose8]);

    useEffect(() => { // Calpose9
        const tmp1 = document.getElementById("calpose9_j1");
        const tmp2 = document.getElementById("calpose9_j2");
        const tmp3 = document.getElementById("calpose9_j3");
        const tmp4 = document.getElementById("calpose9_j4");
        const tmp5 = document.getElementById("calpose9_j5");
        const tmp6 = document.getElementById("calpose9_j6");

        if (tmp1) {
            tmp1.value = calpose9[0];
        }
        if (tmp2) {
            tmp2.value = calpose9[1];
        }
        if (tmp3) {
            tmp3.value = calpose9[2];
        }
        if (tmp4) {
            tmp4.value = calpose9[3];
        }
        if (tmp5) {
            tmp5.value = calpose9[4];
        }
        if (tmp6) {
            tmp6.value = calpose9[5];
        }
    }, [calpose9]);

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

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp));
    };

    function GetPoseClick(num: number) {
        positionManager.getCurrentPos(RobotSpace.JOINT).then((pos) => {
            const tmp: number[] = pos.map((num) => Number(num.toFixed(2)));
            store.dispatch(setcalposes[num](tmp))
        });
    }

    function MoveJointH2RPressed0() {
        const num = 0
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed2() {
        const num = 2
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed3() {
        const num = 3
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed4() {
        const num = 4
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed5() {
        const num = 5
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed6() {
        const num = 6
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed7() {
        const num = 7
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RPressed8() {
        const num = 8
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }

        const idPrefix = `calpose${num + 1}_j`;
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
        store.dispatch(setcalposes[num](arrtmp))

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

    function MoveJointH2RReleased() {
        stopHold2Run();
        motionManager.moveStop(StopType.SLOW).then(result => {
            if (!result) {
                logger.warn("Failed to stop jog.");
            }
        }).catch(e => logger.warn(`Failed to stop jog caused by ${e}`));
    };

    const stopHold2Run = async () => {
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
        store.dispatch(setcalposes[num]([0, 0, 0, 0, 0, 0]))
    }

    const AddClick = async (num: number) => {
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        const drl_run_check = await DrlRunCheck()
        if (drl_run_check) {
            return;
        }

        var DRL_tmp = DRL_Calibration_add_one_point
        var RSS_port_tmp = store.getState().port[0]
        var BPS_port_tmp = store.getState().port[1]
        var tmp = store.getState().ip
        var ip_tmp = String(tmp[0]) + '.' + String(tmp[1]) + '.' + String(tmp[2]) + '.' + String(tmp[3])

        let calibration_positions = [];
        let joint_positions = [];
        const i = num + 1
        for (let j = 1; j <= 6; j++) {
            const tmp = document.getElementById(`calpose${i}_j${j}`);
            joint_positions.push(parseFloat(tmp?.value || '0'));
        }
        calibration_positions.push(`posj(${joint_positions.join(",")})`);

        var DRL_input_var =
            `vel = ${JSON.stringify(store.getState().speed[0]) + '\r'}
acc = ${JSON.stringify(store.getState().speed[1]) + '\r'}
STATE_SRV_PORT = ${JSON.stringify(RSS_port_tmp) + '\r'}
BINPICKING_SRV_PORT = ${JSON.stringify(BPS_port_tmp) + '\r'}
BINPICKING_SRV_IP = ${JSON.stringify(ip_tmp) + '\r'}
home_pose = posj(${store.getState().homepose.join(",")})
calibration_pose = ${calibration_positions.join(",")}
`
        DRL_tmp = DRL_input_var + DRL_tmp
        programManager.runProgram(DRL_tmp, null, null, false)
            .then(result => {
                if (result) {
                    logger.info("Successfully run program.");
                } else {
                    logger.warn(`Failed to run program.`);
                }
            })
            .catch((e: Error) => {
                logger.warn(`Failed to run program by ${e}.`);
            });
    }

    const CalibrationClick = async () => {
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        const drl_run_check = await DrlRunCheck()
        if (drl_run_check) {
            return;
        }
        const monitoringVar: MonitoringVariable[] = [];
        refStateCali.current = true
        refCaliStop.current = false
        monitoringVar.push({ data: 'False', division: 1, name: 'pho_err_occurred', type: 0 })

        var DRL_tmp = DRL_Calibration_run
        var RSS_port_tmp = store.getState().port[0]
        var BPS_port_tmp = store.getState().port[1]
        var tmp = store.getState().ip
        var ip_tmp = String(tmp[0]) + '.' + String(tmp[1]) + '.' + String(tmp[2]) + '.' + String(tmp[3])

        let calibration_positions = [];
        for (let i = 1; i <= 9; i++) {
            let joint_positions = [];
            for (let j = 1; j <= 6; j++) {
                const tmp = document.getElementById(`calpose${i}_j${j}`);
                joint_positions.push(parseFloat(tmp?.value || '0'));
            }
            calibration_positions.push(`posj(${joint_positions.join(",")})`);
        }

        var DRL_input_var =
            `vel = ${JSON.stringify(store.getState().speed[0]) + '\r'}
acc = ${JSON.stringify(store.getState().speed[1]) + '\r'}
STATE_SRV_PORT = ${JSON.stringify(RSS_port_tmp) + '\r'}
BINPICKING_SRV_PORT = ${JSON.stringify(BPS_port_tmp) + '\r'}
BINPICKING_SRV_IP = ${JSON.stringify(ip_tmp) + '\r'}
home_pose = posj(${store.getState().homepose.join(",")})
calibration_positions = [${calibration_positions.join(",")}]
`
        DRL_tmp = DRL_input_var + DRL_tmp

        programManager.monitoringVariables.register(moduleContext, CalibrationCallback);
        const unregistVariableMonitor = (programState: ProgramState) => {
            if (programState !== ProgramState.STOP)
                return;

            programManager.monitoringVariables.unregister(moduleContext, CalibrationCallback);
            refDialogCaliRunning.current?.dismiss();
            if (refStateCali.current == true && refCaliStop.current == false) {
                toast_cali_success()
            }
            programManager.programState.unregister(moduleContext, unregistVariableMonitor);
        }
        programManager.programState.register(moduleContext, unregistVariableMonitor)

        programManager.runProgram(DRL_tmp, null, monitoringVar, false)
            .then(result => {
                if (result) {
                    logger.info("Successfully run program.");
                    const dialogcalirunning = dialog_cali_running(moduleContext, DrlRunStop).build()
                    dialogcalirunning.show()
                    refDialogCaliRunning.current = dialogcalirunning;
                } else {
                    logger.warn(`Failed to run program.`);
                }
            })
            .catch((e: Error) => {
                logger.warn(`Failed to run program by ${e}.`);
            });
    }

    function CalibrationCallback(variable: MonitoringVariable[]) {
        if (variable[0].data == "True") {
            refStateCali.current = false
            refDialogCaliRunning.current?.dismiss();
            const dialogcalifail = dialog_cali_fail(moduleContext).build()
            dialogcalifail.show()
            refDialogCaliFail.current = dialogcalifail;
        }
    }

    function ServoOnCheck() {
        const result = robotManager?.isServoOn()
        if (!result) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_007, true);
        }
        return result
    }

    const DrlRunCheck = async () => {
        const result = await programManager?.getProgramState() // 0:none 1:play 2:stop 3:hold 
        if (result != 0) {
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
        refCaliStop.current = true
    }

    return (
        <FormControl disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} className={`${styles["option-contents"]} ${styles["calibration-pose"]}`}>
            <div className={styles["form-label-wrapper"]}>
                <FormLabel>{messages.calibration_option_title_006}</FormLabel>
            </div>

            {/* Pose 1 Start */}
            <Accordion defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 1</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(0) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed0} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(0) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(0) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose1_j1' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose1_j2' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose1_j3' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose1_j4' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose1_j5' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose1_j6' onBlur={() => onBlurJoint(0)} defaultValue={calpose1[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 1 End */}

            {/* Pose 2 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 2</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(1) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed1} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(1) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(1) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose2_j1' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose2_j2' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose2_j3' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose2_j4' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose2_j5' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose2_j6' onBlur={() => onBlurJoint(1)} defaultValue={calpose2[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 2 End */}

            {/* Pose 3 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 3</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(2) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed2} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(2) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(2) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose3_j1' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose3_j2' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose3_j3' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose3_j4' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose3_j5' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose3_j6' onBlur={() => onBlurJoint(2)} defaultValue={calpose3[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 3 End */}

            {/* Pose 4 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 4</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(3) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed3} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(3) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(3) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose4_j1' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose4_j2' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose4_j3' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose4_j4' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose4_j5' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose4_j6' onBlur={() => onBlurJoint(3)} defaultValue={calpose4[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 4 End */}

            {/* Pose 5 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 5</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(4) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed4} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(4) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(4) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose5_j1' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose5_j2' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose5_j3' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose5_j4' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose5_j5' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose5_j6' onBlur={() => onBlurJoint(4)} defaultValue={calpose5[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 5 End */}

            {/* Pose 6 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 6</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(5) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed5} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(5) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(5) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose6_j1' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose6_j2' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose6_j3' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose6_j4' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose6_j5' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose6_j6' onBlur={() => onBlurJoint(5)} defaultValue={calpose6[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 6 End */}

            {/* Pose 7 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 7</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(6) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed6} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(6) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(6) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose7_j1' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose7_j2' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose7_j3' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose7_j4' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose7_j5' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose7_j6' onBlur={() => onBlurJoint(6)} defaultValue={calpose7[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 7 End */}

            {/* Pose 8 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 8</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(7) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed7} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(7) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(7) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose8_j1' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose8_j2' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose8_j3' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose8_j4' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose8_j5' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose8_j6' onBlur={() => onBlurJoint(7)} defaultValue={calpose8[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 8 End */}

            {/* Pose 9 Start */}
            <Accordion className={styles["pose-control"]} defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel>{messages.label_pose} 9</FormLabel>
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick(8) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed8} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick(8) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                        <Button onClick={(event) => { event.stopPropagation(); AddClick(8) }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnPlus /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='calpose9_j1' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose9_j2' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose9_j3' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose9_j4' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose9_j5' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='calpose9_j6' onBlur={() => onBlurJoint(8)} defaultValue={calpose9[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
            {/* Pose 9 End */}
            <div className={styles["callibration-btn-wrapper"]}>
                <Button onClick={CalibrationClick} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"primary"}>{messages.btn_callibration}</Button>
            </div>
        </FormControl>
    );
}