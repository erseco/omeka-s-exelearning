<?php

declare(strict_types=1);

namespace ExeLearningTest\Form;

use ExeLearning\Form\ConfigForm;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ConfigForm.
 *
 * @covers \ExeLearning\Form\ConfigForm
 */
class ConfigFormTest extends TestCase
{
    private ConfigForm $form;

    protected function setUp(): void
    {
        $this->form = new ConfigForm();
        $this->form->init();
    }

    // =========================================================================
    // Form initialization tests
    // =========================================================================

    public function testFormCanBeCreated(): void
    {
        $form = new ConfigForm();
        $this->assertInstanceOf(ConfigForm::class, $form);
    }

    public function testFormHasViewerHeightElement(): void
    {
        $this->assertTrue($this->form->has('exelearning_viewer_height'));
    }

    public function testFormHasShowEditButtonElement(): void
    {
        $this->assertTrue($this->form->has('exelearning_show_edit_button'));
    }

    // =========================================================================
    // Viewer height element tests
    // =========================================================================

    public function testViewerHeightElementExists(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertNotNull($element);
    }

    public function testViewerHeightIsNumberElement(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertInstanceOf(\Laminas\Form\Element\Number::class, $element);
    }

    public function testViewerHeightHasLabel(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertNotEmpty($element->getLabel());
        $this->assertStringContainsString('Height', $element->getLabel());
    }

    public function testViewerHeightHasDefaultValue(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertEquals(600, $element->getValue());
    }

    public function testViewerHeightHasMinAttribute(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertEquals(200, $element->getAttribute('min'));
    }

    public function testViewerHeightHasMaxAttribute(): void
    {
        $element = $this->form->get('exelearning_viewer_height');
        $this->assertEquals(1200, $element->getAttribute('max'));
    }

    // =========================================================================
    // Show edit button element tests
    // =========================================================================

    public function testShowEditButtonElementExists(): void
    {
        $element = $this->form->get('exelearning_show_edit_button');
        $this->assertNotNull($element);
    }

    public function testShowEditButtonIsCheckboxElement(): void
    {
        $element = $this->form->get('exelearning_show_edit_button');
        $this->assertInstanceOf(\Laminas\Form\Element\Checkbox::class, $element);
    }

    public function testShowEditButtonHasLabel(): void
    {
        $element = $this->form->get('exelearning_show_edit_button');
        $this->assertNotEmpty($element->getLabel());
        $this->assertStringContainsString('Edit', $element->getLabel());
    }

    public function testShowEditButtonHasDefaultCheckedValue(): void
    {
        $element = $this->form->get('exelearning_show_edit_button');
        $this->assertEquals('1', $element->getCheckedValue());
    }

    public function testShowEditButtonHasUncheckedValue(): void
    {
        $element = $this->form->get('exelearning_show_edit_button');
        $this->assertEquals('0', $element->getUncheckedValue());
    }

    // =========================================================================
    // Additional tests
    // =========================================================================

    public function testInitCanBeCalledMultipleTimes(): void
    {
        $this->form->init();
        $this->form->init();

        // Should still have the elements
        $this->assertTrue($this->form->has('exelearning_viewer_height'));
        $this->assertTrue($this->form->has('exelearning_show_edit_button'));
    }
}
