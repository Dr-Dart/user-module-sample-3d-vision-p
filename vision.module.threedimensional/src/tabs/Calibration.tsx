import { ModuleContext} from "dart-api";
import React from 'react';
import { Divider } from "@mui/material";

import styles from "../assets/styles/styles.scss";
import JointSpeed from "../components/JointSpeed";
import HomePose from "../components/HomePose";
import CalibrationPose from "../components/CalibrationPose";

export default function Calibration(props: { moduleContext: ModuleContext }) {
    return (
        <div className={styles["option-tab"]}>
            <JointSpeed moduleContext={props.moduleContext} />
            <Divider />
            <HomePose moduleContext={props.moduleContext} />
            <Divider />
            <CalibrationPose moduleContext={props.moduleContext} />
        </div>
    );
}