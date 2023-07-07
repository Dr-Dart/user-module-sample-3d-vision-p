import { ModuleContext, StopType } from "dart-api";
import React from 'react';
import { Button, FormLabel, TextField, FormControl, InputAdornment, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";

import styles from "../assets/styles/styles.scss";
import IcnGetPose from "../assets/images/icon_get_pose.svg";
import IcnMoveTo from "../assets/images/icon_move_to.svg";
import IcnReset from "../assets/images/icon_reset.svg";

import { logger, IToast, Toast, RobotSpace, Context, IPositionManager, IMotionManager, IRobotManager, IRobotParameterManager, SixNumArray } from "dart-api";
import { useState, useEffect } from 'react';
declare module "@mui/material/Button" {
    interface ButtonPropsVariantOverrides {
        longPressed: true;
    }
}
import store, {
    setHomepose, setJointMax, setJointMin
} from '../reducers'
import { useSelector } from 'react-redux'
import { messages } from '../messages'

export default function HomePose(props: { moduleContext: ModuleContext }) {
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    const positionManager = props.moduleContext.getSystemManager(Context.POSITION_MANAGER) as IPositionManager;
    const motionManager = props.moduleContext.getSystemManager(Context.MOTION_MANAGER) as IMotionManager;
    const robotManager = props.moduleContext.getSystemManager(Context.ROBOT_MANAGER) as IRobotManager;
    const robotparameterManager = props.moduleContext.getSystemManager(Context.ROBOT_PARAMETER_MANAGER) as IRobotParameterManager;

    const homepose = useSelector(state => state.homepose);
    const state_ip = useSelector(state => state.state_ip)
    const state_tcp = useSelector(state => state.state_tcp)

    const [intervalId, setIntervalId] = useState<number>(0);

    useEffect(() => {
        const tmp1 = document.getElementById("homepose_j1");
        const tmp2 = document.getElementById("homepose_j2");
        const tmp3 = document.getElementById("homepose_j3");
        const tmp4 = document.getElementById("homepose_j4");
        const tmp5 = document.getElementById("homepose_j5");
        const tmp6 = document.getElementById("homepose_j6");

        if (tmp1) {
            tmp1.value = homepose[0]
        }
        if (tmp2) {
            tmp2.value = homepose[1]
        }
        if (tmp3) {
            tmp3.value = homepose[2]
        }
        if (tmp4) {
            tmp4.value = homepose[3]
        }
        if (tmp5) {
            tmp5.value = homepose[4]
        }
        if (tmp6) {
            tmp6.value = homepose[5]
        }
    }, [homepose]);


    function onBlurJoint() {
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

        const tmp1 = document.getElementById("homepose_j1");
        const tmp2 = document.getElementById("homepose_j2");
        const tmp3 = document.getElementById("homepose_j3");
        const tmp4 = document.getElementById("homepose_j4");
        const tmp5 = document.getElementById("homepose_j5");
        const tmp6 = document.getElementById("homepose_j6");

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

        store.dispatch(setHomepose(arrtmp))
    };

    function GetPoseClick() {
        positionManager.getCurrentPos(RobotSpace.JOINT).then((pos) => {
            const tmp: number[] = pos.map((num) => Number(num.toFixed(2)));
            store.dispatch(setHomepose(tmp))
        })
    }

    function MoveJointH2RPressed() {
        const servo_check = ServoOnCheck()
        if (!servo_check) {
            return;
        }
        const tmp1 = document.getElementById("homepose_j1");
        const tmp2 = document.getElementById("homepose_j2");
        const tmp3 = document.getElementById("homepose_j3");
        const tmp4 = document.getElementById("homepose_j4");
        const tmp5 = document.getElementById("homepose_j5");
        const tmp6 = document.getElementById("homepose_j6");

        const arrtmp: SixNumArray = [
            parseFloat(tmp1?.value || '0'),
            parseFloat(tmp2?.value || '0'),
            parseFloat(tmp3?.value || '0'),
            parseFloat(tmp4?.value || '0'),
            parseFloat(tmp5?.value || '0'),
            parseFloat(tmp6?.value || '0')
        ];

        store.dispatch(setHomepose(arrtmp))

        stopHold2Run(intervalId);
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
        stopHold2Run(intervalId);
        motionManager.moveStop(StopType.SLOW).then(result => {
            if (!result) {
                logger.warn("Failed to stop jog.");
            }
        }).catch(e => logger.warn(`Failed to stop jog caused by ${e}`));

    };

    const stopHold2Run = async (id: number) => {
        cancelAnimationFrame(id);
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

    function ResetClick() {
        store.dispatch(setHomepose([0, 0, 0, 0, 0, 0]))
    }

    function ServoOnCheck() {
        const result = robotManager?.isServoOn()
        if (!result) {
            Toast.show(IToast.TYPE_INFO, null, messages.toast_message_007, true);
        }
        return result
    }

    return (
        <FormControl disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} className={`${styles["option-contents"]} ${styles["home-pose"]}`}>
            <div className={styles["form-label-wrapper"]}>
                <FormLabel>{messages.calibration_option_title_003}</FormLabel>
            </div>
            <Accordion defaultExpanded={true}>
                <AccordionSummary>
                    <FormLabel />
                    <div className={styles["pose-control-btn"]}>
                        <Button onClick={(event) => { event.stopPropagation(); GetPoseClick() }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} startIcon={<IcnGetPose />}>{messages.btn_get_pose}</Button>
                        <Button onClick={(event) => { event.stopPropagation() }} onPointerDown={MoveJointH2RPressed} onPointerUp={MoveJointH2RReleased} onPointerLeave={MoveJointH2RReleased} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} variant={"longPressed"} startIcon={<IcnMoveTo />}>{messages.btn_move_to}</Button>
                        <Button onClick={(event) => { event.stopPropagation(); ResetClick() }} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} color={"secondary"}><IcnReset /></Button>
                    </div>
                </AccordionSummary>
                <AccordionDetails>
                    <TextField id='homepose_j1' onBlur={onBlurJoint} defaultValue={homepose[0]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J1</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='homepose_j2' onBlur={onBlurJoint} defaultValue={homepose[1]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J2</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='homepose_j3' onBlur={onBlurJoint} defaultValue={homepose[2]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J3</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='homepose_j4' onBlur={onBlurJoint} defaultValue={homepose[3]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J4</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='homepose_j5' onBlur={onBlurJoint} defaultValue={homepose[4]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J5</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                    <TextField id='homepose_j6' onBlur={onBlurJoint} defaultValue={homepose[5]} disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} size={"small"} type={"number"} className={styles["desc-textfield"]}
                        InputProps={{
                            startAdornment: <InputAdornment position={"start"}>J6</InputAdornment>,
                            endAdornment: <InputAdornment position={"end"}>°</InputAdornment>,
                        }} />
                </AccordionDetails>
            </Accordion>
        </FormControl>
    );
}