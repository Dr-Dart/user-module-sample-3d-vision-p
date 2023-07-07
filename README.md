# [Sample 3D Vision Module]
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)


## *Precautions*
**Note**
- This sample code is only works in the Dr.Dart Ecosystem.
- The `Sample 3D Vision Module` is provided as a sample and may not function properly.
- We do not assume any responsibility for any issues that may occur while using this application.
- When operating the robot, please prioritize safety and be cautious of potential collisions with the robot and its surroundings. It is recommended to reduce the speed during operation.
- This module is a sample module and does not receive any modification requests.

**Requirements:**
To successfully utilize the functionalities within this sample example, the following equipment is required:
- Photoneo 3D scanner
- Photoneo Bin Picking Studio
- Photoneo Vision Controller
- Doosan robot
- Doosan robot controller

## *Overview*
This sample provides the functionality to integrate Bin Picking Studio from Photoneo and a robot from Doosan Robotics, allowing calibration and testing of BPS solutions.

|File|Description|
|---|---|
|Manifest.json<br>(In sample-photoneo-bps/<br>vision.module.threedimensional)|To use 1 basic module screen and 1 User Commands,2 screens and 1 services are declared.<br> (*Note. However, in the case of the service, it will be changed so that User Command can operate even if there is only the User Command Service service in the released version.)<br>|
|Index.tsx |The main screen displays IP address settings, TCP/IP port, Calibration Tab, and Solution Tab.<br>- Show the IP adress and make the Set/Unset button work.<br>- Show the BPS web page and make the navigation button work.<br>- Show the TCP/IP Port and make the Apply Reset button work.<br>
|tabs/Calibration.tsx |Show the Calibration Tab screen.
|components/JointSpeed.tsx |Show the Joint Speed screen and make the adjust joint speed work
|components/HomePose.tsx |Show the HomePose screen and make the Set the HomePose work
|components/CalibrationPose.tsx |Show the 9 Calibration Poses screen and make the Set the Calibration poses and Calibration button work.
|tabs/Solutions.tsx |Show the Solutions Tab screen.
|components/SolutionTest.tsx |Show the Solution Test screen and matk the Set parameters and Validation button work
|PIPScreen.tsx |PIP Screen shows User Command Property screen in Task Editor Module.|
|PIPService.tsx |Includes interfaces that must be implemented in User Commands.|
|drl/drl.tsx|DRL text file.<br>(*Note. Currently the 2nd version of EAP has a problem with not being able to find and read DRL files, so DRL must be saved in the form of a const string)|



## *Usage*
#### In this Module, you can
* Before you begin, please ensure that the sensors and products are connected, and create a solution in Photoneo's Bin Picking Studio. For detailed instructions, please refer to Photoneo's website or documentation.

* Execute the module.

* Turn on the Servo.

* Set the IP address of the Bin Picking Server configured in BPS. When connected, the BPS web page will be displayed on the left side.

* Configure the Robot State Server port and Bin Picking Client port.

* Set and save the speed, HomePose, and Calibration pose in the Calibration Tab for calibration. Perform BPS calibration by clicking the Calibration button. <br>(*Note: Before pressing the Calibration button, Calibration must be in progress on the BPS web page. Refer to the documentation provided by Photoneo for more details.)

* The Solutions Tab provides the functionality to test the solutions and vision system configured in BPS.

#### In Task Editor Module(former Task Builder/Task Writer),
* The `Threedimensional_drl` User Command blocks will be displayed in the User Command block list.

* You can add this command block to your task list, modify and save the Input values, Setting, and Main Code. <br>(*Note: It is temporarily stored in the vision.module.threedimensional db. All saved data for threedimensional_drl in the task editor is shared as a single data.)

* When the task is executed, the Solution from Bin Picking Studio and the robot will be integrated to perform bin picking tasks. <br>(*Note: Before running the DRL, the Solution should be deployed in BPS. The source code can be downloaded from the Photoneo website.)


## *Limitations*
#### The current sample version has the following limitations.

1. **[Threedimensional Sample Module]** 
<br>- The BPS web page is currently not displayed correctly. To use this module without connecting to the BPS web server or performing TCP/IP port tests, uncomment the lines marked as 'kdg' in the "index.tsx" file.
<br>- The BPS web page is currently not displayed correctly in this module.
<br>- The Calibration button in the Calibration Tab works correctly only when Calibration is in progress on the BPS.
<br>- The Validation button in the Solutions Tab works correctly only when the Solution is being deployed on the BPS.
<br>- Please refer to the documentation provided by Photoneo for instructions and settings related to Bin Picking Studio.
<br>- The DRL used in this module has been downloaded from the Photoneo website and modified for specific use. For more details, please refer to the documentation provided by Photoneo.
<br>- Please refer to the Dart-developer site and Dart-API documentation for information on the APIs and code usage used in this module.

2. **[UserCommand in Task Editor]** 
<br>- The modification and saving of values in the property window of the threedimensional_drl User Command is temporarily stored in the threedimensional sample module db. All threedimensional_drl commands in the task editor share the same stored data.
<br>- Before using the threedimensional_drl User Command, vision.module.threedimensional needs to be executed once for temporary db creation.