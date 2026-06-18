using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartAccess.API.Services;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService)
    {
        _reportService = reportService ?? throw new ArgumentNullException(nameof(reportService));
    }

    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics(
        [FromQuery] string periodo = "semana",
        [FromQuery] string? desde = null,
        [FromQuery] string? hasta = null)
    {
        var stats = await _reportService.GetStatisticsAsync(periodo, desde, hasta);
        return Ok(stats);
    }

    [HttpGet("statistics/department")]
    public async Task<IActionResult> GetStatisticsByDepartment(
        [FromQuery] string periodo = "semana",
        [FromQuery] string? desde = null,
        [FromQuery] string? hasta = null)
    {
        var stats = await _reportService.GetStatisticsByDepartmentAsync(periodo, desde, hasta);
        return Ok(stats);
    }

    [HttpGet("records")]
    public async Task<IActionResult> GetDetailedRecords(
        [FromQuery] string periodo = "semana",
        [FromQuery] string? desde = null,
        [FromQuery] string? hasta = null,
        [FromQuery] string? departamento = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? turnoId = null)
    {
        var records = await _reportService.GetDetailedRecordsAsync(periodo, desde, hasta, departamento, userId, turnoId);
        return Ok(records);
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportRecords(
        [FromQuery] string periodo = "semana",
        [FromQuery] string? desde = null,
        [FromQuery] string? hasta = null,
        [FromQuery] string? departamento = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? turnoId = null)
    {
        var records = await _reportService.GetDetailedRecordsAsync(periodo, desde, hasta, departamento, userId, turnoId);
        return Ok(records);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserAttendanceReport(
        string userId,
        [FromQuery] string? desde = null,
        [FromQuery] string? hasta = null)
    {
        var report = await _reportService.GetAttendanceReportByUserAsync(userId, desde, hasta);
        return Ok(report);
    }
}
