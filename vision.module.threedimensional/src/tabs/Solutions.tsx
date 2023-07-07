import { ModuleContext } from "dart-api";
import React from 'react';
import { Divider, FormControlLabel, TextField } from "@mui/material";

import styles from "../assets/styles/styles.scss";
import SolutionTest from "../components/SolutionTest";

import store, {
    setSolutionID,
    setVisionSystemID,
} from '../reducers'
import { useSelector } from 'react-redux'
import { messages } from '../messages'

export default function Solutions(props: { moduleContext: ModuleContext }) {
    
    const { moduleContext } = props;
    const { packageName } = moduleContext;

    const solID = useSelector(state => state.sol_id)
    const vsID = useSelector(state => state.vs_id)
    const state_ip = useSelector(state => state.state_ip)
    const state_tcp = useSelector(state => state.state_tcp)

    function onChangeValue(e: React.ChangeEvent<HTMLInputElement>) {
        const { id, value } = e.target;
        var valuetmp = parseInt(value)
        if (id === "txtfield_sol") {
            if (isNaN(valuetmp)) {
                valuetmp = 1
            }
            else if (valuetmp > 255) {
                valuetmp = 255
            }
            else if (valuetmp < 1) {
                valuetmp = 1
            }
            store.dispatch(setSolutionID(parseInt(valuetmp)))
        } else if (id === "txtfield_vs") {
            if (isNaN(valuetmp)) {
                valuetmp = 1
            }
            else if (valuetmp > 100) {
                valuetmp = 100
            }
            else if (valuetmp < 1) {
                valuetmp = 1
            }
            store.dispatch(setVisionSystemID(valuetmp))
        }
    }

    return (
        <div className={styles["option-tab"]}>
            <FormControlLabel disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} control={<TextField id='txtfield_sol' onChange={onChangeValue} size={"small"} value={solID} type={"number"} defaultValue={solID} />} label={messages.solutions_option_title_001} labelPlacement={"start"}
                className={`${styles["option-contents"]} ${styles["id-txt-field"]}`} />
            <Divider />
            <FormControlLabel disabled={!state_ip || !state_tcp[0] || !state_tcp[1]} control={<TextField id='txtfield_vs' onChange={onChangeValue} size={"small"} value={vsID} type={"number"} defaultValue={vsID} />} label={messages.solutions_option_title_002} labelPlacement={"start"}
                className={`${styles["option-contents"]} ${styles["id-txt-field"]}`} />
            <Divider />
            <SolutionTest moduleContext={props.moduleContext} />
        </div>
    );
}