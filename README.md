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

#### Confirm auto generated label attributes before save ####
  ![Confirm auto generated label attributes](images/ConfirmLabel.gif)

#### Go to definition ####
  ![Go to definition](images/Gotodefinition.gif)

#### Find references ####
  ![Find references](images/Findreferences.gif)


## Extension Settings
This extension contributes the following settings:

* `Enable Scan`: Auto scan files for static texts
* `Ignore List`: List of glob patterns to be ignored
* `Label Path`: Path to custom label file
* `Prompt For Confirmation`: Enable this checkbox if you want to review the auto-generated Label API name, Category,description and Language for a new label
* `Language`: Default language for new labels


![Configure](images/configure.gif)