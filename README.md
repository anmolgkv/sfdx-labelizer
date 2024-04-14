# SFDX Labelizer for visual studio code

This extension enables Visual Studio Code to easily generate custom labels from static text in an sfdx project.

## Features
This extension provides easy way to detect and fix static text referenced in a sfdx project for following metadata:
  - LWC component
  - Aura Component
  - Apex classes

## Demo ##

#### Auto detect and fix/add to ignore list ####
  ![Auto detect and fix](images/autoDetectAndFix.gif)

#### Manually select and fix/add to ignore list ####
  ![Auto detect and fix](images/manuallySelectAndFix.gif)


## Extension Settings
This extension contributes the following settings:

* `Labelizer: Enable Scan`: "Auto scan files for static texts"
* `Labelizer: Ignore List`: "List of glob patterns to be ignored"
* `Labelizer: Label Path`: "Path to custom label file"

![Configure](images/configure.gif)